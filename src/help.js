import chalk from 'chalk';

const usage = `
npm run <command> included in ${ chalk.bold( process.env.npm_package_name ) }:

Usage:

npm run ${ chalk.bold( 'help' ) }\t\t\t\t\t\t- this usage page
npm run ${ chalk.bold( 'subscriber -- --p2p_port {port} --peer_id {filename}' ) }\t- run subscriber
npm run ${ chalk.bold( 'publisher -- --p2p_port {port} --peer_id {filename}' ) }\t- run publisher

examples:
1) run a subscriber on port ${ chalk.bold( 9011 ) } with peerId ${ chalk.bold( `./peers/.relay1.peerId` ) }:
# npm run subscriber -- --p2p_port 9011 --peer_id ./peers/.relay1.peerId

2) run a publisher on port ${ chalk.bold( 9019 ) } with peerId ${ chalk.bold( `./peers/.relay9.peerId` ) }:
# npm run publisher -- --p2p_port 9019 --peer_id ./peers/.relay9.peerId

`
console.log( '%s', usage );
