## Intro to the Project
This is the backend for the [ecommerce-project](https://github.com/SuperSimpleDev/ecommerce-project).
- 95% of the code was generated with AI.

## Video Tutorials
**Part 1 - Create the Backend:** https://youtu.be/vBprybSmJs8

## Set up this backend
1. Make sure you have NodeJS installed (version 22+). If not, [click here to install](https://nodejs.org/).
2. Download this code by clicking the green `Code` button (in the top-right) > Click `Download Zip`.
3. Unzip the code. On Windows, right-click the zip file > `Extract All`. On Mac, double-click the zip file.
4. Open this code in VSCode.
5. At the top menu of VSCode, click `Terminal` > `New Terminal`.
6. Set a long, random JWT signing secret. In PowerShell, run `$env:JWT_SECRET = 'replace-this-with-a-long-random-secret'`.
7. In the Terminal, run `npm install`, and run `npm run dev`.

## User API

Set `JWT_SECRET` before using these endpoints. Authentication responses include a JWT. Send it with protected requests as `Authorization: Bearer <token>`.

- `POST /api/auth/register` — body: `{ "name", "email", "password" }` (passwords must be at least 8 characters)
- `POST /api/auth/login` — body: `{ "email", "password" }`
- `GET /api/auth/me`
- `GET|POST /api/favourites` — POST body: `{ "productId" }`
- `DELETE /api/favourites/:productId`

The existing cart, payment summary, and order endpoints now require the same token and only return the signed-in user's records. Creating an order clears only that user's cart.

## Troubleshooting
If you run into issues, see the [troubleshooting steps](troubleshooting.md).
