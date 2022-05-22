// alchemy-nft-api/alchemy-web3-script.js
let { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { ethers } = require('ethers')
const axios = require('axios');
require('dotenv').config()
const { async } = require('q');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle')
const privatekeys = ["a068107a99d9b9178c85241db57984f8a87ccf5f3c529ba9a99fb46126fd2d55"]//JSON.parse(process.env.PRIVATE_KEYS)
const Provider = new ethers.providers.AlchemyProvider("mainnet", "mH36sKIVZXbc7O1etTIlstyWgl_pVShq")
// Standard json rpc provider directly from ethers.js. For example you can use Infura, Alchemy, or your own node.

const authSigner = new ethers.Wallet(privatekeys[0], Provider)
// `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
// This is an identifying key for signing payloads to establish reputation and whitelisting




const contractaddress = "0x7D4B1dA30d1282b59FeD50c4E2F53E82c4B29374" // just paste address in, make sure quotes still there
const mainaddress = "0x604AbA13B91b416b28cb22A4f46820d3BC624390"
const maxprio = 4 // max priority fee in gwei
const maxfee = 50 // max fee in gwei




// Replace with your Alchemy api key:
const apiKey = "mH36sKIVZXbc7O1etTIlstyWgl_pVShq";

// Initialize an alchemy-web3 instance:
const web3 = createAlchemyWeb3(
    `https://eth-mainnet.alchemyapi.io/v2/${apiKey}`,
);





async function main() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(Provider, authSigner)
    // Flashbots provider requires passing in a standard provider and an auth signer


    var sourceresult = { ABI: "" }
    await axios.get(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractaddress}&apikey=` + process.env.ETHERSCAN_KEY).then((res) => {
        sourceresult = res["data"]["result"][0]
    });
    const ABI = sourceresult["ABI"]
    let contract = new ethers.Contract(contractaddress, ABI, Provider)
    let bundle = []
    for (let i = 0; i < privatekeys.length; ++i) {
        let wallet = new ethers.Wallet(privatekeys[i], Provider)
        const ownerAddr = wallet.address;
        const nfts = await web3.alchemy.getNfts({
            owner: ownerAddr,
            contractAddresses: [contractaddress],
            withMetadata: false
        })
        for (const nft of nfts.ownedNfts) {
            let tokenid = parseInt(nft.id.tokenId)
            let transaction = await contract.populateTransaction["safeTransferFrom(address,address,uint256)"](ownerAddr, mainaddress, tokenid, { type: 2, nonce: await wallet.getTransactionCount(), gasLimit: 200000 })
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
            bundle.push({ transaction: transaction, signer: wallet })
        }
    }
    let currentblock = await Provider.getBlockNumber();
    for (let blockoffset = 1; blockoffset < 6; ++blockoffset) {
        const targetBlockNumber = currentblock + blockoffset
        const bundleReceipt = await flashbotsProvider.sendBundle(
            bundle, // bundle we signed above
            targetBlockNumber // block number at which this bundle is valid
        )
        console.log(await bundleReceipt.simulate())

    }




}

main()