const firebase = require('firebase');

const config = {
    apiKey: "AIzaSyDFnnKsggZqXDcZKHFjQGVd6PpnRiVicrw",
    authDomain: "mojodating-prealpha.firebaseapp.com",
    databaseURL: "https://mojodating-prealpha.firebaseio.com",
    projectId: "mojodating-prealpha",
    storageBucket: "mojodating-prealpha.appspot.com",
    messagingSenderId: "617219767268"
};

firebase.initializeApp(config);

const email = "jerzy@test.com";
const password = "test1234";

console.log('test');

const functionToTest = firebase.functions().httpsCallable('getUsersDev');
        functionToTest({ uid: '4d56UvD1jAfAiGHH61dP6USwiNs1', password: 'TestPass123' }).then(function (result) {
            console.log('result: ', result);
            console.log(JSON.stringify(result.data.users.length));
            console.log(JSON.stringify(result.data.users));
        })
        .catch(err => { console.log('inner error: ', err); });

// firebase.functions
// firebase.auth()
//     .signInWithEmailAndPassword(email, password)
//     .then(user => user.user.getIdToken())
//     .then(token => {
//         console.log('start execution');
//         const functionToTest = firebase.functions().httpsCallable('getUsersDev');
//         functionToTest('4d56UvD1jAfAiGHH61dP6USwiNs1').then(function (result) {
//             console.log('result: ', result);
//             console.log(JSON.stringify(result.data.users.length));
//             console.log(JSON.stringify(result.data.users));
//         })
//         .catch(err => { console.log('inner error: ', err); });
//     })
//     .catch(err => {
//         console.log('error: ', err);
//     });
