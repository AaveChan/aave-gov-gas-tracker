import { markdownTable } from "markdown-table";
import fs from "fs";
import { DelegatePlatformFees } from "@/gas-tracker";
import { formatEther } from "viem";

export const generateReport = (
  delegatePlatformsFees: DelegatePlatformFees[]
) => {
  const startBlock = process.env.START_BLOCK;
  const endBlock = process.env.END_BLOCK;
  let report = `# Delegate Platforms Gas Report\n\n`;
  report += `### 🏁 From [${startBlock}](https://etherscan.io/block/${startBlock}) to [${endBlock}](https://etherscan.io/block/${endBlock})\n\n`;

  for (const delegatePlatformFees of delegatePlatformsFees) {
    const reportTable = markdownTable([
      ["Address", "Gas Used (ETH)"],
      ...delegatePlatformFees.addresses.map((addressGasInfo) => [
        addressGasInfo.address,
        formatEther(addressGasInfo.gasUsed),
      ]),
      [
        "**Total**",
        `**${formatEther(
          delegatePlatformFees.addresses.reduce(
            (acc, curr) => acc + curr.gasUsed,
            0n
          )
        )}**`,
      ],
    ]);
    report += `## ${delegatePlatformFees.name}\n\n`;
    report += `${reportTable}\n\n`;
  }

  const dirPath = "./out/reports";
  const filename = "gas-report.md";

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(`${dirPath}/${filename}`, report);
  console.log(`✅ Report generated at ${filename}`);
};
