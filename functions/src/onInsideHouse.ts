import * as util from './util'
import { HOUSE_ENTERANCE_REWARD } from "./config";
const fs = require('fs')
const Tx = require('ethereumjs-tx')

let payHouseReward

// Handler checks if new user enters mojo house
// for every new user it payes reward in Jo tokens
// and sends notification to device
export const handler = (messaging, web3, change) => {
    console.log('Function triggered by user change');
    const newValue = change.after.data();
    const previousValue = change.before.data();

    if (newValue.insideHouse !== previousValue.insideHouse && newValue.insideHouse === true) {
        console.log('New user enters the house, pay reward and send notification')
        const token = newValue.token
        const address = newValue.address
        console.log(`user token: ${token}, user address: ${address}`)

        const payload = {
            notification: {
                title: "Welcome in Mojo House",
                body: "Congratulations you've entered the Mojo House."
            }
        }

       return payHouseReward(web3, address)
            .then(messaging.sendToDevice(token, payload))
            .then(function(response) {
                console.log("Successfully sent message:", response);
            })
            .catch(function(error) {
                console.error("Error sending message:", error);
            })
    }

    return null
}

payHouseReward = (web3, to) => {
    console.log('payHouseReward')

    const jotokenAddress = process.env.JOTOKEN_ADDRESS
    const relayer = process.env.RELAYER_ADDRESS
    const relayerPrivKey = process.env.RELAYER_PRIVATE_KEY

    // create JOToken instance
    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, jotokenAddress)

    return web3.eth.getTransactionCount(relayer)
    .then(relayerNonce => {
        // create raw transaction and sign it by relayer
        const rawTransaction = {
            from: relayer,
            nonce: web3.utils.toHex(relayerNonce),
            gasPrice: web3.utils.toHex(20* 1e9),
            gasLimit: web3.utils.toHex(2000000),
            to: jotokenAddress,
            value: "0x0",
            data: JOToken.methods.transfer(to, web3.utils.toHex(HOUSE_ENTERANCE_REWARD)).encodeABI(),
            "chainId": 0x04
        };
        const tx = new Tx(rawTransaction);
        tx.sign(util.formattedAddress(relayerPrivKey));

        // send transaction
        return web3.eth.sendSignedTransaction('0x' + tx.serialize().toString('hex'))
    })
    .catch(err => {
        console.log('error: ', err);
        throw err;
    })
}