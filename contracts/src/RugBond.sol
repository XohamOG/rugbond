// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

interface IBurnable {
    function burn(uint256 amount) external;
}

/// @title RugBond
/// @notice Locks WIF behind a public promise that named wallets will keep a minimum
///         balance of a coin until a set date. Anyone can slash a broken promise.
/// @dev Unaudited. No owner, no pause, no upgrade path.
contract RugBond is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Active,
        Slashed
    }

    struct WalletPromise {
        address wallet;
        uint256 minBalance;
    }

    struct Bond {
        address creator;
        address token;
        uint64 unlockAt;
        Status status;
        uint256 total; // WIF currently held for this bond
    }

    uint256 public constant MIN_BOND = 10_000e18;
    uint256 public constant MAX_BOND = 2_000_000e18;
    uint256 public constant MIN_DURATION = 10 minutes;
    uint256 public constant MAX_DURATION = 365 days;
    uint256 public constant MAX_WALLETS = 10;
    /// @dev Applied to the creator's own stake only, so slashing a bond can never
    ///      pay anyone out of third-party funders' WIF.
    uint256 public constant SLASH_REWARD_BPS = 2000;
    uint256 public constant BALANCE_GAS = 100_000;

    bytes32 public constant CONSENT_TYPEHASH = keccak256(
        "Consent(address creator,address token,address wallet,uint256 minBalance,uint64 unlockAt,uint256 nonce,uint256 deadline)"
    );

    IERC20 public immutable WIF;

    mapping(uint256 => Bond) public bonds;
    mapping(uint256 => WalletPromise[]) private _promises;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(address => uint256) public nonces;
    uint256 public nextId;

    event BondPosted(uint256 indexed id, address indexed creator, address indexed token, uint64 unlockAt, uint256 amount);
    event BondFunded(uint256 indexed id, address indexed funder, uint256 amount);
    event BondSlashed(
        uint256 indexed id,
        address indexed caller,
        address indexed wallet,
        uint256 balance,
        uint256 minBalance,
        uint256 burned,
        uint256 reward
    );
    event BondWithdrawn(uint256 indexed id, address indexed funder, uint256 amount);

    error NotActive();
    error Expired();
    error NotExpired();
    error NotBreached();
    error InsufficientGas();
    error BadParams();
    error BadSignature();
    error BalanceBelowPromise();
    error BondCapExceeded();
    error NothingToWithdraw();
    error DeadlinePassed();
    error AlreadyBreached();

    constructor(address wif) EIP712("RugBond", "1") {
        if (wif.code.length == 0) revert BadParams();
        WIF = IERC20(wif);
    }

    /// @notice Posts a bond. Every wallet must be the caller or have signed a Consent.
    /// @param signatures One entry per promise, in order. Ignored for the caller's own wallet.
    function post(
        address token,
        WalletPromise[] calldata promises,
        uint64 unlockAt,
        uint256 amount,
        uint256 deadline,
        bytes[] calldata signatures
    ) external nonReentrant returns (uint256 id) {
        uint256 count = promises.length;
        if (token.code.length == 0 || count == 0 || count > MAX_WALLETS || signatures.length != count) {
            revert BadParams();
        }
        if (block.timestamp > deadline) revert DeadlinePassed();
        if (unlockAt < block.timestamp + MIN_DURATION || unlockAt > block.timestamp + MAX_DURATION) {
            revert BadParams();
        }

        id = nextId++;
        address previous;
        for (uint256 i; i < count; ++i) {
            WalletPromise calldata p = promises[i];
            // Strictly ascending also rejects duplicates and the zero address.
            if (p.wallet <= previous || p.minBalance == 0) revert BadParams();
            previous = p.wallet;
            if (p.wallet != msg.sender) _checkConsent(token, p, unlockAt, deadline, signatures[i]);
            _promises[id].push(p);
        }

        uint256 received = _pull(amount);
        if (received < MIN_BOND) revert BadParams();
        if (received > MAX_BOND) revert BondCapExceeded();

        // Checked after the pull: the bonded coin may be WIF itself, and the pull lowers the caller's balance.
        for (uint256 i; i < count; ++i) {
            (bool ok, uint256 balance) = _readBalance(token, promises[i].wallet);
            if (!ok || balance < promises[i].minBalance) revert BalanceBelowPromise();
        }

        bonds[id] = Bond({creator: msg.sender, token: token, unlockAt: unlockAt, status: Status.Active, total: received});
        contributions[id][msg.sender] = received;

        emit BondPosted(id, msg.sender, token, unlockAt, received);
    }

    /// @notice Adds WIF to a healthy bond. Funders' WIF burns in full if the bond is slashed.
    function fund(uint256 id, uint256 amount) external nonReentrant {
        Bond storage b = bonds[id];
        if (b.status != Status.Active) revert NotActive();
        if (block.timestamp >= b.unlockAt) revert Expired();
        (bool breached,,) = _firstBreach(id, b.token);
        if (breached) revert AlreadyBreached();

        uint256 received = _pull(amount);
        if (received == 0) revert BadParams();
        if (b.total + received > MAX_BOND) revert BondCapExceeded();

        b.total += received;
        contributions[id][msg.sender] += received;

        emit BondFunded(id, msg.sender, received);
    }

    /// @notice Slashes a bond whose promise at `index` is broken. Pays the caller and burns the rest.
    function slash(uint256 id, uint256 index) external nonReentrant {
        Bond storage b = bonds[id];
        if (b.status != Status.Active) revert NotActive();
        if (block.timestamp >= b.unlockAt) revert Expired();
        if (index >= _promises[id].length) revert BadParams();

        WalletPromise memory p = _promises[id][index];
        (bool ok, uint256 balance) = _readBalance(b.token, p.wallet);
        if (ok && balance >= p.minBalance) revert NotBreached();

        uint256 total = b.total;
        uint256 reward = (contributions[id][b.creator] * SLASH_REWARD_BPS) / 10_000;
        uint256 burned = total - reward;

        b.status = Status.Slashed;
        b.total = 0;

        IBurnable(address(WIF)).burn(burned);
        WIF.safeTransfer(msg.sender, reward);

        emit BondSlashed(id, msg.sender, p.wallet, balance, p.minBalance, burned, reward);
    }

    /// @notice Returns the caller's own contribution once the bond has expired unbroken.
    function withdraw(uint256 id) external nonReentrant {
        Bond storage b = bonds[id];
        if (b.status != Status.Active) revert NotActive();
        if (block.timestamp < b.unlockAt) revert NotExpired();

        uint256 amount = contributions[id][msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        contributions[id][msg.sender] = 0;
        b.total -= amount;
        WIF.safeTransfer(msg.sender, amount);

        emit BondWithdrawn(id, msg.sender, amount);
    }

    /// @notice Finds the first promise that could be slashed right now.
    /// @return breached False for bonds that are slashed, expired or do not exist.
    function findBreach(uint256 id) external view returns (bool breached, uint256 index, uint256 balance) {
        Bond storage b = bonds[id];
        if (b.status != Status.Active || block.timestamp >= b.unlockAt) return (false, 0, 0);
        return _firstBreach(id, b.token);
    }

    function promisesOf(uint256 id) external view returns (WalletPromise[] memory) {
        return _promises[id];
    }

    /// @notice The EIP-712 digest a wallet signs to consent to a promise.
    function consentDigest(
        address creator,
        address token,
        address wallet,
        uint256 minBalance,
        uint64 unlockAt,
        uint256 nonce,
        uint256 deadline
    ) public view returns (bytes32) {
        return _hashTypedDataV4(
            keccak256(abi.encode(CONSENT_TYPEHASH, creator, token, wallet, minBalance, unlockAt, nonce, deadline))
        );
    }

    function _checkConsent(
        address token,
        WalletPromise calldata p,
        uint64 unlockAt,
        uint256 deadline,
        bytes calldata signature
    ) private {
        bytes32 digest = consentDigest(msg.sender, token, p.wallet, p.minBalance, unlockAt, nonces[p.wallet]++, deadline);
        if (!SignatureChecker.isValidSignatureNow(p.wallet, digest, signature)) revert BadSignature();
    }

    function _pull(uint256 amount) private returns (uint256) {
        uint256 before = WIF.balanceOf(address(this));
        WIF.safeTransferFrom(msg.sender, address(this), amount);
        return WIF.balanceOf(address(this)) - before;
    }

    function _firstBreach(uint256 id, address token)
        private
        view
        returns (bool breached, uint256 index, uint256 balance)
    {
        WalletPromise[] storage ps = _promises[id];
        uint256 count = ps.length;
        for (uint256 i; i < count; ++i) {
            (bool ok, uint256 current) = _readBalance(token, ps[i].wallet);
            if (!ok || current < ps[i].minBalance) return (true, i, current);
        }
        return (false, 0, 0);
    }

    /// @dev A failed read counts as a breach, so a token cannot protect its bond by
    ///      reverting. The gas guard stops a caller faking that failure with low gas.
    ///      Assembly avoids copying unbounded return data. `amount` is 0 on a failed read.
    function _readBalance(address token, address wallet) private view returns (bool ok, uint256 amount) {
        if (gasleft() < (BALANCE_GAS * 64) / 63 + 5_000) revert InsufficientGas();

        assembly ("memory-safe") {
            mstore(0x00, shl(224, 0x70a08231)) // balanceOf(address)
            mstore(0x04, wallet)
            ok := staticcall(BALANCE_GAS, token, 0x00, 0x24, 0x00, 0x20)
            ok := and(ok, gt(returndatasize(), 0x1f))
            amount := mul(ok, mload(0x00))
        }
    }
}
