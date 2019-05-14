import * as functions from 'firebase-functions';
// tslint:disable:no-shadowed-variable

const filterUsers = (querySnapshot, minYear, maxYear, genderPreference, user) => {
    let users = [];
    querySnapshot
        .forEach(user => {
            users = [
                ...users,
                user.data(),
            ];
        });
    const usersAlreadyInChat = user.conversations ? Object.keys(user.conversations)
        .map(key => user.conversations[key])
        .filter(conversation => conversation.sender === user.uid || 
            (conversation.receiver === user.uid && conversation.accepted === true))
        .map(conversation => conversation.sender === user.uid ? conversation.receiver : conversation.sender) : [];
    const usersFound = users
        .map(user => ({
            uid: user.uid,
            school: user.school,
            imageUrl1: user.imageUrl1,
            imageUrl2: user.imageUrl2,
            imageUrl3: user.imageUrl3,
            imageUrl4: user.imageUrl4,
            imageUrl5: user.imageUrl5,
            address: user.address,
            location: user.location,
            age: user.age,
            fullname: user.fullname,
            genderSeeking: user.genderSeeking,
            minSeekingAge: user.minSeekingAge,
            maxSeekingAge: user.maxSeekingAge,
            bouncingLineRatingCount: user.bouncingLineRatingCount,
            insideHouse: user.insideHouse,
            bouncingLineRating: user.bouncingLineRating,
            profession: user.profession,
            gender: user.gender,
            bio: user.bio,
        }))
        .filter(user => user.age >= minYear)
        .filter(user => user.age <= maxYear)
        .filter(user => genderPreference === 'All' ? user : user.gender === genderPreference)
        .filter(user => usersAlreadyInChat.indexOf(user.uid) === -1)
        .sort((a, b) => {
            if (a.fullname < b.fullname) { return -1; }
            if (a.fullname > b.fullname) { return 1; }
            return 0;
        });
    return { 
        users: usersFound.reduce((newUsers, current) => {
            newUsers[current.uid] = current;
            return newUsers;
        }, {}) 
    };
}

// Handler for getMojoHouse function
// data - {} (optional)
// context - Firebase https.onCall Context
// db - firestore database to use in function
export const handler = (data, context, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }
    // if(data.password !== 'TestPass123') {
    //     throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
    //          'while authenticated.');
    // }

    const userRef = db.collection('users').doc(context.auth.uid);
    // const userRef = db.collection('users').doc(data.uid);
    return userRef.get()
        .then(doc => {
            const currentUser = doc.data();
            const minYear = currentUser.minSeekingAge ? currentUser.minSeekingAge : 0;
            const maxYear = currentUser.maxSeekingAge ? currentUser.maxSeekingAge : 200;
            const genderPreference = (currentUser.genderSeeking && currentUser.genderSeeking !== 'All') ?
                currentUser.genderSeeking : 'All';
            if (data && data.insideHouse === true) {
                return db.collection("users").where("insideHouse", "==", true)
                    .get()
                    .then((querySnapshot) => filterUsers(querySnapshot, minYear, maxYear, genderPreference, currentUser))
                    .catch(function (error) {
                        console.log("Error getting documents: ", error);
                    });
            } else if (data && data.insideHouse === false) {
                return db.collection("users").where("insideHouse", "==", false)
                    .get()
                    .then((querySnapshot) => filterUsers(querySnapshot, minYear, maxYear, genderPreference, currentUser))
                    .catch(function (error) {
                        console.log("Error getting documents: ", error);
                    });
            } else {
                return db.collection("users")
                    .get()
                    .then((querySnapshot) => filterUsers(querySnapshot, minYear, maxYear, genderPreference, currentUser))
                    .catch(function (error) {
                        console.log("Error getting documents: ", error);
                    });
            }
        });
}