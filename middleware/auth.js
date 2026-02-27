export default async function (req, res, next) {
    const username = req.cookies.username;
    if (username) {
        next();
    } else {
        res.redirect('/');
    }
}