# DVote - Decentralized Voting System Adhoc Idea

_Beyond Academic Scope Project Idea_

---

# DVote Application Scope
- As EXP-6 is the Blockchain Lab Mini Project it is the most crucial experiment that needs indepth technical knowledge of Web3, Web Development, Backend, etc.
- The Decentralized Voting System is a common go to solution for Web3 projects but as to standout it has to go beyond the typical academic scope and to be almost a production ready voting system catering real-world application of Decentralized Voting.
- The DVote application is highly customized to Indian subcontinent featuring the complete voting process which is conducted in India through the Election Commission of India (ECI).
- The DVote application will mimick the complete offline election process which is traditionally followed by Indian Voters during the National, State, Constituency, etc. types of Elections.
- The DVote will tackle the problem statement of inconsistent and biased voting which is taking place in India resulting into EVM tampering, double voting, fake voter adding before election process, voting count increase post official election duration, single voter prsent in multiple constituency, etc.
- The DVote application tends to be simple, scalable, highly available Decentralized Voting Platform which assures trust and empowers democracy with Web3 principles.

# DVote Application Feature Desciription Adhoc

## DVote MVP Features (beyond Academic Scope)

1) The DVote Application will include the 1-Person-1-Wallet-1-Vote procedure where only single person can vote at a time, in a given election and in the given constituency.
- DVote app will make sure that the vote malpractices doesn't happen if the voter has multi-wallet (i.e. N-Wallet-1-Person-N-Vote) or multiple accounts (i.e. 1-Wallet-N-Accounts-1-Person-N-Vote).
- DVote will have a strict KYC Verification feature which would be essential for the Voter as well as the Candidate to participate in the election process.
- DVote KYC Verification will include the 2 Most Essential ID Verification which is Aadhar Card and EPIC ID (Voter ID) which is required for any Indian Citizen to participate into election process.
- DVote will save both Aadhar ID as well as EPIC ID to prevent voting malpractices. In special scenarios when a Voter doesn't have an EPIC ID the ECI allows the voter to vote only on the basis of Aadhar Card also. This feature needs to be planned accordingly such that no voting malpractices can take place.
- DVote application will have KYC Verfication for the Candidate as well who is going to register for the electoral process. The Candidate side of registration and KYC verification needs to be discussed with an extensive research on official docs and laws which governs the elctoral process in India.
- DVote app will cater to all types and levels of Election which are officially conducted by ECI to give the DVote a strong foundation with scalable requirement catering.
- DVote app will have roles for Election Management process at various levels. These are the roles which will have Owner Access to the DVote application (Admin, ECI, SRO and RO). The final role Observer will have access to Non-Owner side of the DVote app with its own Observer route for specific operations.

2) The DVote Application include robust technical features for Frontend and Backend side of functionalities.
- The env variables of Frontend and Backend both will have prefilled Wallet Addresses which will automatically detect that which role has logged into the DVote application (i.e. Admin, ECI, SRO, RO or Observer).
- According to the role detection the DVote app will show custom interfaces for Owner-only Access (Full Access including Observer side), Non-owner Observer only access and Voter only access.
- There will be a KYC verification process for Owner-roles (Admin, ECI, SRO and RO) if they wish to participate in the election. But will follow the same process that a normal Voter will follow during Electoral Process. No Owner-roles can switch their wallets as they're registered once and for all and they're predefined in the env as well.
- There will be a KYC verification process for Observer as well if they wish to participate in the election. But will follow the same process that a normal Voter will follow during Electoral Process. No Owner-roles can switch their wallets as they're registered once and for all and they're predefined in the env as well.
- There will be a Voter and Candidate Management section on Owner-side of the DVote application. Where the Owner-roles can manually verify the KYC submission of a Voter/Candidate in order to allow them for electoral process or not. The Voter and Candidate Management feature on Owner-side needs to be discussed thorughly before planning its feature description.
- There will be an Election and Result Management section on the Owner-side of the application. Where the Owner-roles can manually create, manage, pause and perform various other management operations on Election and Results declaration. The Election and Result Management feature on Owner-side needs to be discussed thorughly before planning its feature description.
- There will be an Observerability and Alerts section on the Owner-side as well as in the Observer-side of the application. Where the Owner-roles and Observer can monitor, report and alert during the Electoral Process to the Voters/Candidates and other Owner-roles as well for anomaly detection or technical error during/before/after elections.
- The DVote application will have a strict timeout period similar to a Banking application. Whether any user of roles Owner, Non-owner, Voters are performing any sort of action (i.e. voting, KYC, management, etc.) after a period of time (i.e. 30 mins of inactivity) the session will automatically terminated and the user will be logged out. The details or any continuous tasks which the user were performing will remain persistant and will resume wherever the user last left it after the user successfully logs in via the registered wallet.
- There will be in an Inbox feature for both Owner, Non-Owner and Voters where they'll receive all the notifications regarding the electoral process on DVote application. This has to be designed very strategically as per the roles because all the notifications needs to be categoriezed for each roles (i.e. Owner will receive KYC Verification alerts from Voters/Candidates, anomaly alerts, etc.). The notification feature also deserves an extensive research and discussion before planning its feature description.

## DVote Technical Aspects (beyond Academic Scope)

1) DVote Frontend 
- The DVote app Frontend will be developed using the tech stack of React + Vite, Tailwind CSS, Shadcn, Rainbow, Wagmi, TanStack tools and other frontend modules which takes the DVote application UI/UX to the next level.
- The DVote app will strictly follow the Vercel's Web Interface Guidelines for developing consistent UI features (`docs/WIG.md`).
- The DVote app will have a tri-color scheme in its design tokens which will be standardized. These tri-colors will be for Indian Flag (Saffron, White and Green). 
- The DVote app will not have a dark mode to cater the tri-color sceheme effectively. But the usage of the tri-color scheme has to be very strategic accoding to modern UI/UX principles. Besides tri-color which other colors will be essential for various other stylings has to be carefully decided.
- The DVote app will have make use of sidebars navbar, modals, popup, popovers and sweet alerts throughout the application. To give a proper DApp feel with modern web application features and beyond generic website look. Strategic discussion is needed on how the application will manage pages, tabs, modals and sidebars effectively for various features and functionalities.
- The DVote app page content will render between the navbar and footer of the application similar to that of Vercel and other various modern web app designs.
- The DVote app will efficiently include virtual scrolling for inpage contents and lists that could easily grow. The application will make use of custom scroll area which Shadcn compatible throughout the application whether its page scrolling (global) or inpage/inmodal scrolling (virtual/local) to avoid default scrollbar which is provided by the browser whenever a scroll area is detected. This custom scroll area will be smartly adapted throughout the application whenever a scroll area is detected at any location, any device (i.e. mobile, tablets, desktop).
- The DVote application will effectively make use of animation effects throughout the application with use of Tailwind/Shadcn compatible animation effects. Since the Frontend will be deployed separately use of animations makes sense as the Frontend is a template layer between Users, DApp and Backend.
- The DVote Frontend will have proper assets splitting and chunk size optimization such that the build is highly modular, scalable and dynamic. The HTML, CSS and JS assets should be splitted with strategic planning as the build should be optimized for deployment on Vercel's serverless/edge architecture. A research will be needed on how to structure a React+Vite application for Vercel's platform with Vercel specific files/folders that are needed to be configured.
- The DVote app Frontend will reside in the `Exp-6/frontend` folder as complete in itself. It will have its own packages, dependencies, .env, .env.example, README, .gitignore (despite global .gitignore in the root of the repo), Vercel configs, etc.

2) The DVote Backend
- The DVote app Backend will be developed using Express, Prisma, SQLite, Caching Database (if needed), S3 Connection (AWS S3, Cloudfare R2, Google Cloud Storage Buckets, etc.), TanStack tools and other backend modules which takes the DVote application backend API system to the next level in local as well as production.
- The DVote Backend will cater the critical operations of the DVote application which needs a thorough discussion.
- The DVote Backend needs effecient system design principles before planning its feature description as it will handle on-chain operation delegation and off-chain operation management.
- The SQLite connection will be made using Turso (`https://turso.tech`) which provides highly available SQLite and I've already created a database with name `dvotemain` along with connection string and token to be included in env.
- The S3 connection will be primarily cater to the file uploads, user profile pics (Owners, Voters/Candidates, etc.) and other critical images which is optimal to be not included in the Frontend build. I already have a Cloudflare R2 bucket ready along with all the essential connection credentials to be included in env. Since we're making it S3 compatible the env setup should not be overhead and confusing for anyone.
- The Prisma is the main database client and ORM we're going to use for securing the application in every possible way and to make best of use of Prisma with SQLite for the DVote use case.
- For session timeout and persistance scenarios we might need a Caching database beyond just broswer-based. This has to be discussed strategically.
- The DVote backend should be designed with primary consideration of security and scalability to effeciently manage incoming traffic, rate limiting, pooling systems, CORS etc. There has to be a thorough discussion on what the Backend will handle for the DVote app functioning.
- The DVote Backend will have proper assets splitting and chunk size optimization such that the build is highly secure, scalable and robust. The API, routes, function executions needs to be strategically discussed for optimized build deployment on Vercel.
- Similar to Frontend the Backend will also be deployed on Vercel's serverless/edge architecture as as an Express build. A research will be needed on how to structure an Express application for Vercel's platform with Vercel specific files/folders that are needed to be configured.
- The DVote app Backend will reside in the `Exp-6/backend` folder as complete in itself. It will have its own packages, dependencies, .env, .env.example, README, .gitignore (despite global .gitignore in the root of the repo), Vercel configs, etc.

3) The DVote Foundry
- The DVote Foundry is the heart of the entire DVote application which caters the custom contracts that we'll create for our application's critical on-chain operations.
- The DVote Foundry will make use of Solidity to its full potential in creating a real-world robust Decentralized Voting System. We'll make use of Foundry and Solidy specific documentation for the same.
- The DVote Foundry will include all the contracts, scripts, test scripts, deploy scripts, etc. to guide user in manual execution tasks (MET's) and crucial developmemt moments (CDM's).
- The DVote Foundry will be deployed on Ethereum's Sepolia Testnet with strategic verification, gas fee structure, on-chain opertional costs, etc.
- The DVote will support the user login via the popular wallets MetaMask (primary), Rainbow, Base Account (Coinbase), WalletConnect, etc.
- The DVote Foundry on-chain opertions and contracts needs a thorough research based discussion and strategic planning before writing its feature description.
- The DVote app Owner (Admin, ECI, SRO, RO) and Observer roles have their MetaMask wallet ready with approx 0.2 Sepolia ETH in each with only Admin having the highest Sepoila ETH of 1.083.
- The DVote Foundry will use Hardhat as a secondary fallback in case major inconsistencies take place. Still Foundry remains the primary choice for DVote applications DApp operations.
- The DVote app Foundry will reside in the `Exp-6/` folder (Exp-6 root folder) as complete in itself. It will have its own packages, dependencies, .env, .env.example, README, .gitignore (despite global .gitignore in the root of the repo), Foundry configs, etc.

## DVote Personal Suggestions (Adhoc)

1) The DVote app Frontend requires some cool observability and alerts features to show the live electoral process, alerts and realtime functionalities. So, the use of polling, WebSocket or other realtime functionality is required with strategic discussion the same. Ensure that the design choice doesn't turn out to be a overhead later.
2) The tri-color shades which I chose is (Saffron (#E87F24), White (#FBF6F6) and Green (48A111)). We'll discuss on how these tri-color will form the base of DVote design system with additional colors for various use cases.
3) The DVote should mimick the entire electoral process which Voters and Candidate go through whenever real-world offline elections are conducted by ECI. This will result in strong problem statement support and feature description on how DVote can cater robust, fair and less malpracticed election process than the normal EVM (Electronic Voting Machine) which is provisioned by ECI/
4) Some of the routes I decided for the DVote app 
 - Landing (`/`) (Before Login)
 - Home (`/admin` || `/:uuserid` || `/observer`) (After Login)
 - Admin Specific Routes (`/admin/*`)
 - Observer Specific Routes (`/observer/*`)
 - User Specific Routes (`/:uuserid/*`)
 - Elections (`/elections`) & Specific Election (`/elections/:uelectionid/`)
 - Results (`/results`) & Specific Election Result (`/results/:uelectionid`)
5) Whenever a Non-Owner tries to visit `/admin` route he will redirected to the previous route he was present or else the Home (`/:userid` || `/observer`).
6) Observer route will also be protected from Voter as discussed the env variables will automatically provision the interfaces for specific user roles with robust guard rails.
7) I want the DVote app to be complete ecosystem within itself such that the user feels protected, assured gets better UX along with developer satisfaction as result of professional system design.