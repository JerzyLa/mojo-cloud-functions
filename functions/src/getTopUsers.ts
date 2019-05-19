import * as functions from 'firebase-functions';
// tslint:disable:no-shadowed-variable

const sortUsers = (querySnapshot, percent = 10) => {
    let users = [];
    querySnapshot
        .forEach(user => {
            users = [
                ...users,
                user.data(),
            ];
        });
    console.log('users length: ', users.length);
    const usersCount = Math.ceil(users.length * (percent / 100));
    console.log('filtered users count: ', usersCount);
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
        .sort((a, b) => {
            if ((a.bouncingLineRating / a.bouncingLineRatingCount) < (b.bouncingLineRating / b.bouncingLineRatingCount)) { return -1; }
            if ((a.bouncingLineRating / a.bouncingLineRatingCount) > (b.bouncingLineRating / b.bouncingLineRatingCount)) { return 1; }
            return 0;
        })
        .slice(0, usersCount);
    console.log('usersFound: ', usersFound);
    return {
        users: usersFound.reduce((newUsers, current) => {
            newUsers[current.uid] = current;
            return newUsers;
        }, {})
    };
}

// Handler for getMojoHouse function
// data - { percent - top X% users by rating } (optional)
// context - Firebase https.onCall Context
// db - firestore database to use in function
export const handler = (data, context, db) => {

    if (!context.auth) {
        throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
            'while authenticated.');
    }

    return db.collection("users")
        .get()
        .then((querySnapshot) => sortUsers(querySnapshot, data ? data.percent : undefined))
        .catch(function (error) {
            console.log("Error getting documents: ", error);
        });
}