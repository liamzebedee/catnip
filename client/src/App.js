import React, { Component } from "react";
import BFactoryContract from "./contracts/BFactory.json"
import YesContract from "./contracts/Yes.json";
import NoContract from "./contracts/No.json";
import DaiContract from "./contracts/Dai.json";
import getWeb3 from "./getWeb3";
import "./App.css";
const { abi } = require('./contracts/BPool.json');


//App controls the user interface
class App extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  state = {
    web3: null,
    accounts: null,
    bfactoryContract: null,
    yesContract: null,
    noContract: null,
    daiContract: null,
    pool: null,
    bpoolAddress: null,
    fromToken: "",
    toToken: "",
    fromAmount: "",
    toAmount: "",
  };

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the BFactory contract instance.
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = BFactoryContract.networks[networkId];
      const bfactoryInstance = new web3.eth.Contract(
        BFactoryContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      // Get Yes contract instance
      const networkId2 = await web3.eth.net.getId();
      const deployedNetwork2 = YesContract.networks[networkId2];
      const yesInstance = new web3.eth.Contract(
        YesContract.abi,
        deployedNetwork2 && deployedNetwork2.address,
      );

      // Get No contract instance
      const networkId3 = await web3.eth.net.getId();
      const deployedNetwork3 = NoContract.networks[networkId3];
      const noInstance = new web3.eth.Contract(
        NoContract.abi,
        deployedNetwork3 && deployedNetwork3.address,
      );

      // Get Dai contract instance
      const networkId4 = await web3.eth.net.getId();
      const deployedNetwork4 = DaiContract.networks[networkId4];
      const daiInstance = new web3.eth.Contract(
        DaiContract.abi,
        deployedNetwork4 && deployedNetwork4.address,
      );

      // Set web3, accounts, and contracts to the state
      this.setState({
        web3,
        accounts,
        bfactoryContract: bfactoryInstance,
        yesContract: yesInstance,
        noContract: noInstance,
        daiContract: daiInstance,
      });

      const { bfactoryContract } = this.state;
      const { noContract } = this.state;
      const { yesContract } = this.state;
      const { daiContract } = this.state;
 

      // @ mint YES, NO and Dai and send to LP1
      await yesContract.methods.mint(accounts[1], web3.utils.toWei('5000')).send({ from: accounts[0] });
      await noContract.methods.mint(accounts[1], web3.utils.toWei('5000')).send({ from: accounts[0] });
      await daiContract.methods.mint(accounts[1], web3.utils.toWei('5000')).send({ from: accounts[0] });

      // @ mint Dai and send to Trader1
      await daiContract.methods.mint(accounts[2], web3.utils.toWei('5000')).send({ from: accounts[0] });

      console.log("Balances of LP1 and Trader1 after minting and before pool creation");
      var LP1YesBalance = await yesContract.methods.balanceOf(accounts[1]).call();
      LP1YesBalance = web3.utils.fromWei(LP1YesBalance)
      console.log("LP1 Yes balance: ", LP1YesBalance)

      var LP1NoBalance = await noContract.methods.balanceOf(accounts[1]).call();
      LP1NoBalance = web3.utils.fromWei(LP1NoBalance)
      console.log("LP1 No balance: ", LP1NoBalance)

      var LP1DaiBalance = await daiContract.methods.balanceOf(accounts[1]).call();
      LP1DaiBalance = web3.utils.fromWei(LP1DaiBalance)
      console.log("LP1 Dai balance: ", LP1DaiBalance)

      var Trader1DaiBalance = await daiContract.methods.balanceOf(accounts[2]).call();
      Trader1DaiBalance = web3.utils.fromWei(Trader1DaiBalance);
      Trader1DaiBalance = Number(Trader1DaiBalance);
      Trader1DaiBalance = Trader1DaiBalance.toFixed(2);
      console.log("Trader1 Dai balance: ", Trader1DaiBalance);

      // create a new balancer pool and save address to state, bind tokens and set public
      const tx = await bfactoryContract.methods.newBPool().send({from: accounts[1], gas: 6000000 });
      var bpoolAddress = tx.events.LOG_NEW_POOL.returnValues[1]
      this.setState({ bpoolAddress: bpoolAddress });
      var pool = new web3.eth.Contract(abi, this.state.bpoolAddress);
      this.setState( {pool: pool} );
      await yesContract.methods.approve(this.state.bpoolAddress, web3.utils.toWei('5000')).send( {from: accounts[1], gas: 6000000 });
      await pool.methods.bind(yesContract.options.address, web3.utils.toWei('5000'), web3.utils.toWei('18.75')).send( {from: accounts[1], gas: 6000000 });
      await noContract.methods.approve(this.state.bpoolAddress, web3.utils.toWei('5000')).send( {from: accounts[1], gas: 6000000 });
      await pool.methods.bind(noContract.options.address, web3.utils.toWei('5000'), web3.utils.toWei('6.25')).send( {from: accounts[1], gas: 6000000 });
      await daiContract.methods.approve(this.state.bpoolAddress, web3.utils.toWei('5000')).send( {from: accounts[1], gas: 6000000 });
      await pool.methods.bind(daiContract.options.address, web3.utils.toWei('5000'), web3.utils.toWei('25')).send( {from: accounts[1], gas: 6000000 });
      await pool.methods.setPublicSwap(true).send( {from: accounts[1], gas: 6000000 });

      // print back end parameters to console.log
      console.log("Parameters of Augur prediction market pool on Balancer")

      var poolYesBalance = await pool.methods.getBalance(yesContract.options.address).call();
      poolYesBalance = web3.utils.fromWei(poolYesBalance);
      console.log("poolYesBalance: ", poolYesBalance);

      var poolYesNormWeight = await pool.methods.getNormalizedWeight(yesContract.options.address).call();
      poolYesNormWeight = web3.utils.fromWei(poolYesNormWeight);
      console.log("poolYesNormWeight: ", poolYesNormWeight);

      var poolNoBalance = await pool.methods.getBalance(noContract.options.address).call();
      poolNoBalance = web3.utils.fromWei(poolNoBalance);
      console.log("poolNoBalance: ", poolNoBalance);

      var poolNoNormWeight = await pool.methods.getNormalizedWeight(noContract.options.address).call();
      poolNoNormWeight = web3.utils.fromWei(poolNoNormWeight);
      console.log("poolNoNormWeight: ", poolNoNormWeight);

      var poolDaiBalance = await pool.methods.getBalance(daiContract.options.address).call();
      poolDaiBalance = web3.utils.fromWei(poolDaiBalance);
      console.log("poolDaiBalance: ", poolDaiBalance);

      var poolDaiNormWeight = await pool.methods.getNormalizedWeight(daiContract.options.address).call();
      poolDaiNormWeight = web3.utils.fromWei(poolDaiNormWeight);
      console.log("poolDaiNormWeight: ", poolDaiNormWeight);

      LP1YesBalance = await yesContract.methods.balanceOf(accounts[1]).call();
      LP1YesBalance = web3.utils.fromWei(LP1YesBalance)

      LP1NoBalance = await noContract.methods.balanceOf(accounts[1]).call();
      LP1NoBalance = web3.utils.fromWei(LP1NoBalance)

      LP1DaiBalance = await daiContract.methods.balanceOf(accounts[1]).call();
      LP1DaiBalance = web3.utils.fromWei(LP1DaiBalance)

      Trader1DaiBalance = await daiContract.methods.balanceOf(accounts[2]).call();
      Trader1DaiBalance = web3.utils.fromWei(Trader1DaiBalance);

      // Test calcToGivenFrom and swapExactAmountIn
      console.log("Let's see how many yes tokens we can get for 100 dai ...");
      this.setState({fromToken: daiContract.options.address});
      this.setState({toToken: yesContract.options.address});
      this.setState({ fromAmount: 100 });
      console.log("fromAmount: ", this.state.fromAmount);
      await this.calcToGivenFrom();
      console.log("Looks good so let's swap ...");
      await this.swapExactAmountIn();

      // Test calcFromGivenTo and swapExactAmountOut
      console.log("Now let's see how many dai we will need to get 50 no tokens ...");
      this.setState({fromToken: daiContract.options.address});
      this.setState({toToken: noContract.options.address});
      this.setState({ toAmount: 50 });
      await this.calcFromGivenTo();
      console.log("OK let her rip ...");
      await this.swapExactAmountOut();

    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, contract or tokens. Check console for details.`,
      );
      console.error(error);
    }
  };

  // This function updates state in response to user input
  handleChange = async (e) => {
    this.setState({ [e.target.name]: e.target.value });
    console.log(e.target.name, ": ", e.target.value);
  }

  // Calculates number of "to" tokens received for a given number of "from" tokens
  calcToGivenFrom = async () => {
    const { pool } = this.state;
    const { web3 } = this.state;
    const { fromToken } = this.state;
    const { toToken } = this.state;
    const { fromAmount } = this.state;

    try {
      var fromTokenBalance = await pool.methods.getBalance(fromToken).call();
      fromTokenBalance = web3.utils.fromWei(fromTokenBalance);

      var fromTokenWeight = await pool.methods.getNormalizedWeight(fromToken).call();
      fromTokenWeight = web3.utils.fromWei(fromTokenWeight);

      var toTokenBalance = await pool.methods.getBalance(toToken).call();
      toTokenBalance = web3.utils.fromWei(toTokenBalance);

      var toTokenWeight = await pool.methods.getNormalizedWeight(toToken).call();
      toTokenWeight = web3.utils.fromWei(toTokenWeight);
      var intermediate1 = fromTokenBalance / ( Number(fromTokenBalance) + Number(fromAmount) )
      var intermediate2 =  intermediate1 ** (fromTokenWeight / toTokenWeight)
      var toAmount = toTokenBalance * ( 1 -  intermediate2  );
      toAmount = toAmount.toFixed(2)
      this.setState( { toAmount: toAmount } );
      console.log("toAmount: ", toAmount);

      return toAmount ;
    } catch (error) {
      alert(
        `Attempt to create new smart pool failed. Check console for details.`,
      );
      console.error(error);
    }
  };

  // Calculates number of "from" tokens received for a given number of "to" tokens
  calcFromGivenTo = async () => {
    const { pool } = this.state;
    const { web3 } = this.state;
    const { fromToken } = this.state;
    const { toToken } = this.state;
    const { toAmount } = this.state;

    try {
      var fromTokenBalance = await pool.methods.getBalance(fromToken).call();
      fromTokenBalance = web3.utils.fromWei(fromTokenBalance);

      var fromTokenWeight = await pool.methods.getNormalizedWeight(fromToken).call();
      fromTokenWeight = web3.utils.fromWei(fromTokenWeight);

      var toTokenBalance = await pool.methods.getBalance(toToken).call();
      toTokenBalance = web3.utils.fromWei(toTokenBalance);

      var toTokenWeight = await pool.methods.getNormalizedWeight(toToken).call();
      toTokenWeight = web3.utils.fromWei(toTokenWeight);

      var intermediate1 = toTokenBalance / ( Number(toTokenBalance) + Number(toAmount) )
      var intermediate2 =  intermediate1 ** (toTokenWeight / fromTokenWeight)
      var fromAmount = fromTokenBalance * ( intermediate2 - 1 );
      fromAmount = - fromAmount.toFixed(2)
      this.setState( { fromAmount: fromAmount } );
      console.log("fromAmount: ", fromAmount);

      return toAmount ;
    } catch (error) {
      alert(
        `Attempt to create new smart pool failed. Check console for details.`,
      );
      console.error(error);
    }
  };


// Swap with the number of from tokens fixed
  swapExactAmountIn = async () => {
    const { pool } = this.state;
    const { web3 } = this.state;
    const { fromToken } = this.state;
    const { toToken } = this.state;
    const { noContract } = this.state;
    const { yesContract } = this.state;
    const { daiContract } = this.state;
    const { accounts } = this.state;
    var { fromAmount } = this.state;
    var { toAmount } = this.state;


    fromAmount = web3.utils.toWei(this.state.fromAmount.toString());
    toAmount = 0
    toAmount = web3.utils.toWei(toAmount.toString());
    var maxPrice = 2 * (this.state.toAmount / this.state.fromAmount);
    maxPrice = web3.utils.toWei(maxPrice.toString())

    try {
      //approve fromAmount of fromToken for spending by Trader1
      if (fromToken === noContract.options.address) {
        await noContract.methods.approve(pool.options.address, fromAmount).send({from: accounts[2], gas: 6000000 });
        var noAllowance = await noContract.methods.allowance(accounts[2], pool.options.address).call();
        console.log("noAllowance: ", noAllowance);
      } else if (fromToken === yesContract.options.address) {
        await yesContract.methods.approve(pool.options.address, fromAmount).send({from: accounts[2], gas: 6000000 });
        var yesAllowance = await yesContract.methods.allowance(accounts[2], pool.options.address).call();
        console.log("yesAllowance: ", yesAllowance);
      } else if (fromToken === daiContract.options.address) {
        await daiContract.methods.approve(pool.options.address, fromAmount).send({from: accounts[2], gas: 6000000 });
      } var tx = await pool.methods.swapExactAmountIn(fromToken, fromAmount, toToken, toAmount, maxPrice).send({from: accounts[2], gas: 6000000 });
        console.log("Successful transaction: ", tx.status)
        console.log("Checking balances after transaction ...")
        var Trader1YesBalance = await yesContract.methods.balanceOf(accounts[2]).call();
        Trader1YesBalance = web3.utils.fromWei(Trader1YesBalance)
        Trader1YesBalance = Number(Trader1YesBalance);
        Trader1YesBalance = Trader1YesBalance.toFixed(2);
        console.log("Trader1YesBalance: ", Trader1YesBalance)
        var Trader1DaiBalance = await daiContract.methods.balanceOf(accounts[2]).call();
        Trader1DaiBalance = web3.utils.fromWei(Trader1DaiBalance);
        Trader1DaiBalance = Number(Trader1DaiBalance);
        Trader1DaiBalance = Trader1DaiBalance.toFixed(2);
        console.log("Trader1 Dai balance: ", Trader1DaiBalance);

      } catch (error) {
      alert(
        `Attempt to create new smart pool failed. Check console for details.`,
      );
      console.error(error);
    }
  }; 
  
// Swap with the number of from tokens fixed
swapExactAmountOut = async () => {
  const { pool } = this.state;
  const { web3 } = this.state;
  const { fromToken } = this.state;
  const { toToken } = this.state;
  const { noContract } = this.state;
  const { yesContract } = this.state;
  const { daiContract } = this.state;
  const { accounts } = this.state;
  var { fromAmount } = this.state;
  var { toAmount } = this.state;


  toAmount = web3.utils.toWei(this.state.toAmount.toString());
  fromAmount = 2 * fromAmount
  fromAmount = web3.utils.toWei(toAmount.toString());
  var maxPrice = 2 * (this.state.fromAmount / this.state.toAmount);
  maxPrice = web3.utils.toWei(maxPrice.toString())

  try {
    //approve fromAmount of fromToken for spending by Trader1
    if (fromToken === noContract.options.address) {
      await noContract.methods.approve(pool.options.address, fromAmount).send({from: accounts[2], gas: 6000000 });
      var noAllowance = await noContract.methods.allowance(accounts[2], pool.options.address).call();
      console.log("noAllowance: ", noAllowance);
    } else if (fromToken === yesContract.options.address) {
      await yesContract.methods.approve(pool.options.address, fromAmount).send({from: accounts[2], gas: 6000000 });
      var yesAllowance = await yesContract.methods.allowance(accounts[2], pool.options.address).call();
      console.log("yesAllowance: ", yesAllowance);
    } else if (fromToken === daiContract.options.address) {
      await daiContract.methods.approve(pool.options.address, fromAmount).send({from: accounts[2], gas: 6000000 });
    } var tx = await pool.methods.swapExactAmountOut(fromToken, fromAmount, toToken, toAmount, maxPrice).send({from: accounts[2], gas: 6000000 });
      console.log("Successful transaction: ", tx.status)
      console.log("Checking balances after transaction ...")
      var Trader1NoBalance = await noContract.methods.balanceOf(accounts[2]).call();
      Trader1NoBalance = web3.utils.fromWei(Trader1NoBalance)
      console.log("Trader1 No Balance: ", Trader1NoBalance)
      var Trader1DaiBalance = await daiContract.methods.balanceOf(accounts[2]).call();
      Trader1DaiBalance = web3.utils.fromWei(Trader1DaiBalance);
      Trader1DaiBalance = Number(Trader1DaiBalance);
      Trader1DaiBalance = Trader1DaiBalance.toFixed(2);
      console.log("Trader1 Dai balance: ", Trader1DaiBalance);



  } catch (error) {
    alert(
      `Attempt to create new smart pool failed. Check console for details.`,
    );
    console.error(error);
  }
}; 



  render() {
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <div className="App">
        Hello World
      </div>
    );
  };
};

export default App;