import * as functions from 'firebase-functions';

// Handler for getMojoHouse function
// data - {} (optional)
// context - Firebase https.onCall Context
// db - firestore database to use in function
export const handler = (data, context, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    const userRef = db.collection('users').doc(context.auth.uid);
    return userRef.get()
        .then(doc => {
            const currentUser = doc.data();
            const minYear = currentUser.minSeekingAge ? currentUser.minSeekingAge : 0;
            const maxYear = currentUser.maxSeekingAge ? currentUser.maxSeekingAge : 200;
            const genderPreference = (currentUser.genderSeeking && currentUser.genderSeeking !== 'All') ?
                currentUser.genderSeeking : 'All';
            return db.collection("users").where("insideHouse", "==", false)
                .get()
                .then((querySnapshot) => {
                    let users = [];
                    querySnapshot
                        .forEach(user => {
                            users = [
                                ...users,
                                user.data(),
                            ];
                        });
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
                    }))
                    .filter(user => user.age > minYear)
                    .filter(user => user.age < maxYear)
                    .filter(user => genderPreference === 'All' ? user : user.gender === genderPreference)
                    .sort((a, b) => {
                        if (a.fullname < b.fullname) { return -1; }
                        if (a.fullname > b.fullname) { return 1; }
                        return 0;
                    });
                    return { users: usersFound };
                })
                .catch(function (error) {
                    console.log("Error getting documents: ", error);
                });
        });
}
