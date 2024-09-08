const usage = `
npm run <command> included in ${ chalk.bold( process.env.npm_package_name ) }:

Usage:

npm run ${ chalk.bold( 'help' ) }\t\t- this usage page
npm run ${ chalk.bold( 'sub1' ) }\t\t- run a predefined subscriber No.1
npm run ${ chalk.bold( 'sub2' ) }\t\t- run a predefined subscriber No.2
npm run ${ chalk.bold( 'pub' ) }\t\t- run a predefined publisher
npm run ${ chalk.bold( 'sub -- --p2p_port {port} --peer_id {filename}' ) }\t- run a custormized subscriber
npm run ${ chalk.bold( 'pub -- --p2p_port {port} --peer_id {filename}' ) }\t- run a custormized publisher

examples:
1) run a subscriber 1 on port ${ chalk.bold( 61610 ) } with peerId ${ chalk.bold( `./examples/deploy/sub1.peerId` ) }:
# npm run sub1

2) run a subscriber 2 on port ${ chalk.bold( 61611 ) } with peerId ${ chalk.bold( `./examples/deploy/sub2.peerId` ) }:
# npm run sub2

3) run a publisher on port ${ chalk.bold( 61601 ) } with peerId ${ chalk.bold( `./examples/deploy/pub.peerId` ) }:
# npm run pub

1) run a subscriber on port ${ chalk.bold( 9011 ) } with peerId ${ chalk.bold( `./peers/.relay1.peerId` ) }:
# npm run sub -- --p2p_port 9011 --peer_id ./peers/.relay1.peerId

2) run a publisher on port ${ chalk.bold( 9019 ) } with peerId ${ chalk.bold( `./peers/.relay9.peerId` ) }:
# npm run pub -- --p2p_port 9019 --peer_id ./peers/.relay9.peerId

`

import chalk from 'chalk';
console.log( '%s', usage );
