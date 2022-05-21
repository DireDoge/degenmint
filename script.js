const {ethers} = require('ethers')
const axios = require('axios');
require('dotenv').config()
const { async } = require('q');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle')
const privatekeys = JSON.parse(process.env.PRIVATE_KEYS)
const Provider = new ethers.providers.AlchemyProvider("mainnet", "mH36sKIVZXbc7O1etTIlstyWgl_pVShq")
// Standard json rpc provider directly from ethers.js. For example you can use Infura, Alchemy, or your own node.

const authSigner = new ethers.Wallet(privatekeys[0], Provider) 
// `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
// This is an identifying key for signing payloads to establish reputation and whitelisting

//LOOK HERE

const address = "0xcA1D3A34bEbC97A7eEb02d0ae93A44b17Ccf6b5e" // just paste address in, make sure quotes still there
const rawprice = "0" // price in eth
const input1 = 2 //probably qty
const input2 = null //put number as necessary, null otherwise
const functionname = "mint"
const maxprio = 3 // max priority fee in gwei
const maxfee = 150 // max fee in gwei

// LOOK HERE

async function main() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(Provider, authSigner)
    // Flashbots provider requires passing in a standard provider and an auth signer
    
    
    var sourceresult = { ABI: "" }
    await axios.get(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=` + process.env.ETHERSCAN_KEY).then((res) => {
        sourceresult = res["data"]["result"][0]
    });
    const ABI = sourceresult["ABI"]
    let contract = new ethers.Contract(address,ABI,Provider)
    let price = String(ethers.utils.parseUnits(rawprice,"wei"));
    let bundle = []
    for (let i = 0; i < privatekeys.length; ++i){
        let wallet = new ethers.Wallet(privatekeys[i],Provider)
        let transaction = null
        if (input2 !== null){
            transaction = await contract.populateTransaction[functionname](input1,input2,{value: price, type:2, nonce: await wallet.getTransactionCount(),gasLimit: 150_000})
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
        }
        else if (input1 !== null){
            transaction = await contract.populateTransaction[functionname](input1,{value: price, type:2, nonce: await wallet.getTransactionCount(),gasLimit: 150_000})
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
        }
        else{
            transaction = await contract.populateTransaction[functionname]({value: price, type:2, nonce: await wallet.getTransactionCount(),gasLimit: 150_000})
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
        }
        let signedtxn = await wallet.signTransaction(transaction)
        bundle.push({signedTransaction: signedtxn})
    }
    console.log(bundle)
    
    const targetBlockNumber = await Provider.getBlockNumber()
    const minTimestamp = (await Provider.getBlock(targetBlockNumber)).timestamp
    const maxTimestamp = minTimestamp + 120
    const signedTransactions = await flashbotsProvider.signBundle(bundle)
    //const simulation = await flashbotsProvider.simulate(signedTransactions, targetBlockNumber, targetBlockNumber + 1)
    //console.log(JSON.stringify(simulation, null, 2))

    
    const bundleReceipt = await flashbotsProvider.sendRawBundle(
        signedTransactions, // bundle we signed above
        targetBlockNumber, // block number at which this bundle is valid
        {
            minTimestamp, // optional minimum timestamp at which this bundle is valid (inclusive)
            maxTimestamp // optional maximum timestamp at which this bundle is valid (inclusive)
        }
    )
    console.log(bundleReceipt)
}

main()