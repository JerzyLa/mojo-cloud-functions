import * as shortid from 'shortid';
import * as util from './util'
import { CREATE_ACCOUNT_REWARD } from "./config";
const fs = require('fs')
const Tx = require('ethereumjs-tx')

let payCreateReward;

export const handler = async (user, db, web3) => {
    console.log('A new user has been added.')

    const account = web3.eth.accounts.create()
    const address = account.address
    const privateKey = account.privateKey

    console.log(`Generated ethereum address: ${address} for user ${user.uid}`)
    const userResult = await db.collection('users').doc(user.uid).set({
        uid: user.uid,
        invitationCode: shortid.generate(),
        address: address,
        privateKey: privateKey,
        nonce: 0,
        insideHouse: false
    });

    const source = fs.readFileSync(require.resolve('./../build/contracts/JOToken.json'))
    const parsedSource = JSON.parse(source)
    const JOToken = new web3.eth.Contract(parsedSource.abi, '0xfEc08bb2439bf6Bb207480F78B9db5C0b6aa50cE')
    try {
        await payCreateReward(web3, address)

        const txRef = await db.collection("transactions").add({
            fromUid: "mojo-app",
            toAddr: address,
            value: CREATE_ACCOUNT_REWARD / 1e18,
            status: "done",
            type: "reward",
            date: new Date().getTime() / 1000
        })
        await txRef.update({ id: txRef.id })

        // print balance, to check if reward was paid properly
        const weiBalance = await JOToken.methods.balanceOf(address).call()
        const balance = Number(web3.utils.fromWei(weiBalance, 'ether'))
        console.log(`balance: ${balance}`)
        return userResult;
    } catch(error) {
        console.error("Error:", error);
    }

    return null;
}

payCreateReward = (web3, to) => {
    console.log('payCreateReward')

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
                gasPrice: web3.utils.toHex(20 * 1e9),
                gasLimit: web3.utils.toHex(2000000),
                to: jotokenAddress,
                value: "0x0",
                data: JOToken.methods.transfer(to, web3.utils.toHex(CREATE_ACCOUNT_REWARD)).encodeABI(),
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
