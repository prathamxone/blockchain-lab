const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('PaxtonToken', function () {
  let token;
  let owner;
  let addr1;
  let addr2;

  const INITIAL_SUPPLY = ethers.parseUnits('1000000', 18); // 1,000,000 PXT

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const PaxtonToken = await ethers.getContractFactory('PaxtonToken');
    token = await PaxtonToken.deploy(owner.address);
  });

  // ─── Block A — Deployment ────────────────────────────────────────────────

  describe('Deployment', function () {
    it("should set the token name to 'Paxton'", async function () {
      expect(await token.name()).to.equal('Paxton');
    });

    it("should set the token symbol to 'PXT'", async function () {
      expect(await token.symbol()).to.equal('PXT');
    });

    it('should set decimals to 18', async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it('should mint the initial supply to the deployer', async function () {
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it('should set the deployer as the owner', async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  // ─── Block B — Transfer ──────────────────────────────────────────────────

  describe('Transfer', function () {
    it('should transfer tokens between accounts', async function () {
      const amount = ethers.parseUnits('100', 18);
      await token.transfer(addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
    });

    it('should emit Transfer event on transfer', async function () {
      const amount = ethers.parseUnits('100', 18);
      await expect(token.transfer(addr1.address, amount))
        .to.emit(token, 'Transfer')
        .withArgs(owner.address, addr1.address, amount);
    });

    it('should revert when transferring more than balance', async function () {
      const excess = ethers.parseUnits('1000001', 18);
      await expect(
        token.connect(addr1).transfer(owner.address, excess)
      ).to.be.revertedWithCustomError(token, 'ERC20InsufficientBalance');
    });
  });

  // ─── Block C — Allowance & transferFrom ──────────────────────────────────

  describe('Allowance and transferFrom', function () {
    it('should approve and check allowance', async function () {
      const amount = ethers.parseUnits('50', 18);
      await token.approve(addr1.address, amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(amount);
    });

    it('should transferFrom with correct allowance', async function () {
      const amount = ethers.parseUnits('50', 18);
      await token.approve(addr1.address, amount);
      await token.connect(addr1).transferFrom(owner.address, addr2.address, amount);

      expect(await token.balanceOf(addr2.address)).to.equal(amount);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(0);
    });

    it('should revert transferFrom without sufficient allowance', async function () {
      const amount = ethers.parseUnits('50', 18);
      await expect(
        token.connect(addr1).transferFrom(owner.address, addr2.address, amount)
      ).to.be.revertedWithCustomError(token, 'ERC20InsufficientAllowance');
    });
  });

  // ─── Block D — Mint (onlyOwner) ──────────────────────────────────────────

  describe('Mint', function () {
    it('should allow owner to mint new tokens', async function () {
      const mintAmount = ethers.parseUnits('500', 18);
      await token.mint(addr1.address, mintAmount);

      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it('should revert if non-owner tries to mint', async function () {
      const mintAmount = ethers.parseUnits('500', 18);
      await expect(
        token.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(token, 'OwnableUnauthorizedAccount');
    });
  });

  // ─── Block E — Burn ──────────────────────────────────────────────────────

  describe('Burn', function () {
    it('should allow a holder to burn their tokens', async function () {
      const burnAmount = ethers.parseUnits('200', 18);
      await token.burn(burnAmount);

      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it('should revert when burning more than balance', async function () {
      const excess = ethers.parseUnits('1000001', 18);
      await expect(token.connect(addr1).burn(excess)).to.be.revertedWithCustomError(
        token,
        'ERC20InsufficientBalance'
      );
    });
  });
});
