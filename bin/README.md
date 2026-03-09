# Agent Lily CLI

<p align="center">
  <img src="./lily.png" alt="Agent Lily CLI" width="180" />
</p>

Command-line interface for operating Agent Lily from a terminal.

## Install

```bash
npm install -g agent-lily
```

## Usage

```bash
lily help
```

## Authentication

```bash
lily auth status
lily auth token <TOKEN>
lily auth logout
```

This stores CLI credentials locally at `~/.lily/config.json`.

## Commands

```bash
lily status [--token TOKEN]
lily yields [--token TOKEN]
lily report [--token TOKEN]
lily runs [--token TOKEN] [--limit N]
lily run [--token TOKEN]
lily config get [--token TOKEN]
lily config set [options] [--token TOKEN]
```

## Config Set Options

```bash
--current-chain-id N
--position-usdc AMOUNT
--auto-rebalance-enabled true|false
--min-yield-delta-pct N
--min-net-gain-usd N
--max-route-cost-usd N
--cooldown-minutes N
--allowed-destination-chain-ids 1,10,8453
--blocked-chain-ids 42161,43114
--alert-webhook-url URL
--telegram-bot-token TOKEN
--telegram-chat-id CHAT_ID
--telegram-enabled true|false
```

## Environment Variables

```bash
LILY_AGENT_TOKEN=<TOKEN>
LILY_NO_BANNER=true
```

## Examples

```bash
lily auth token <TOKEN>
lily status
lily yields
lily runs --limit 5
lily run
lily config get
lily config set --current-chain-id 42161 --position-usdc 250 --telegram-enabled true
```

## Notes

- `LILY_AGENT_TOKEN` provides the token if one is not stored locally.
- `LILY_NO_BANNER=true` disables the terminal banner.
