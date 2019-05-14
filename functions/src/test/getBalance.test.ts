// const firebase = require('firebase');

// const config = {
//     apiKey: "AIzaSyDFnnKsggZqXDcZKHFjQGVd6PpnRiVicrw",
//     authDomain: "mojodating-prealpha.firebaseapp.com",
//     databaseURL: "https://mojodating-prealpha.firebaseio.com",
//     projectId: "mojodating-prealpha",
//     storageBucket: "mojodating-prealpha.appspot.com",
//     messagingSenderId: "617219767268"
// };

// firebase.initializeApp(config);

// const email = "jerzy@test.com";
// const password = "test1234";

// console.log('test');

// firebase.functions
// firebase.auth()
//     .signInWithEmailAndPassword(email, password)
//     .then(user => user.user.getIdToken())
//     .then(token => {
//         console.log('start execution');
//         const functionToTest = firebase.functions().httpsCallable('getBalance');
//         functionToTest({ uid: 'YSUmtGYzefScjYOSi2CwHvBIoGt2' }).then(function (result) {
//             console.log('result: ', result);
//             console.log(JSON.stringify(result.data));
//         })
//         .catch(err => { console.log('inner error: ', err); });
//     })
//     .catch(err => {
//         console.log('error: ', err);
//     });