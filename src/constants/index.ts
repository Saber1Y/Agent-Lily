export const COLORS = {
  lifi: {
    pink: '#F7C2FF',
    blue: '#5C67FF',
  },
  background: {
    primary: '#0A0A0F',
    secondary: '#12121A',
    card: '#1A1A24',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0B0',
    muted: '#606070',
  },
  border: {
    default: '#2A2A35',
    hover: '#3A3A48',
  },
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
};

export const CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', color: '#627EEA', logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { id: 42161, name: 'Arbitrum', symbol: 'ARB', color: '#28A0F0', logo: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg' },
  { id: 8453, name: 'Base', symbol: 'BASE', color: '#0052FF', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgDoYGJ7Vai-DIk-xXlSfPu2XwJhzSig_BpQ&s' },
  { id: 10, name: 'Optimism', symbol: 'OP', color: '#FF0420', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', color: '#8247E5', logo: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
  { id: 56, name: 'BNB Chain', symbol: 'BNB', color: '#F3BA2F', logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', color: '#E84142', logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 1151111081099710, name: 'Solana', symbol: 'SOL', color: '#9945FF', logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
];

export const FEATURES = [
  {
    icon: 'HiOutlineTrendingUp',
    title: 'Live Yield Radar',
    description: 'Track live Aave USDC opportunities across Lily’s supported cross-chain universe.',
  },
  {
    icon: 'HiOutlineSwitchHorizontal',
    title: 'LI.FI Route Engine',
    description: 'Quote and execute cross-chain USDC moves through LI.FI with wallet-aware routing.',
  },
  {
    icon: 'HiOutlineSparkles',
    title: 'Policy + AI Reasoning',
    description: 'Blend deterministic treasury rules with Gemini reasoning for explainable decisions.',
  },
  {
    icon: 'HiOutlineRefresh',
    title: 'Operator Workflow',
    description: 'Use approvals, reports, Telegram alerts, and CLI access from one control plane.',
  },
];

export const STEPS = [
  {
    number: '01',
    title: 'Open The Dashboard',
    description: 'Start from Lily’s dashboard to review approvals, reports, chat, and operator status.',
  },
  {
    number: '02',
    title: 'Review The Opportunity',
    description: 'Lily compares cross-chain yields, estimates route cost, and explains the tradeoff.',
  },
  {
    number: '03',
    title: 'Execute Or Automate',
    description: 'Approve in chat with your wallet, or run the same workflow through automation and CLI.',
  },
];
