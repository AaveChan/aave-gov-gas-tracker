export const requireEnv = () => {
  if (
    !process.env.START_BLOCK ||
    !process.env.END_BLOCK ||
    !process.env.ETHERSCAN_API_KEY
  ) {
    console.error("❌ Missing Tenderly environment variables, run aborted");
    throw "";
  }
};
