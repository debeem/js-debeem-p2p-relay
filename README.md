# debeem-p2p-relay

The `debeem-p2p-relay` is developed based on the Libp2p library, enabling users to easily and quickly build private P2P networks and achieve real-time data synchronization between nodes. 

It supports grouping an arbitrary number of nodes based on business requirements and dynamically, proactively electing a leader within each business group to facilitate collaboration between master and subordinate nodes.


## Table of contents
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Get Started](#get-started)
- [Create a Private P2P Network](#configure-a-private-p2p-network)
  - [Swarm Key](#swarm-key)
    - [What is a Swarm Key](#what-is-a-swarm-key) 
    - [Generate a Swarm Key](#generate-a-swarm-key)
    - [Configure a Private P2P Network Using a Swarm Key](#configure-a-private-p2p-network-using-a-swarm-key)
  - [Peer Id](#peer-id)
    - [What is a Peer Id](#what-is-a-swarm-key)
    - [Generate a Peer Id](#generate-a-peer-id)
    - [Configure a Static Peer Id for a Node](#configure-a-static-peerid-for-a-node)
- [Create a Bootstrapper Node](#configure-a-bootstrapper-for-a-private-p2p-network)
- [Configure a P2P Node](#configure-a-p2p-node)
- [Business Group](#business-group)
  - [What is a Business Group](#what-is-a-swarm-key)
  - [Create a Business Group](#configure-a-business-group)
  - [Trigger Proactive Dialing within a Business Group](#configure-a-business-group)
  - [How to Elect a Leader within the Group](#How to elect a leader within the group)
  - [How to Identify the Leader](#How to identify the leader)
- [Relay Doctor](#business-group)
  - [What is a Relay Doctor](#what-is-a-swarm-key)
  - [What can Relay Doctor do](#what-is-a-swarm-key)
  - [How to Enable Relay Doctor](#what-is-a-swarm-key)
