import { markdownTable } from "markdown-table";
import fs from "fs";
import {
  AllDelegatePlatformsFees,
  FeesTypes,
  feesTypesNames,
} from "@/gas-tracker";
import { formatEther } from "viem";

export const generateReport = (
  delegatePlatformsFees: AllDelegatePlatformsFees
) => {
  const startBlock = process.env.START_BLOCK;
  const endBlock = process.env.END_BLOCK;
  let report = `# Delegate Platforms Gas Report\n\n`;
  report += `### 🏁 From [${startBlock}](https://etherscan.io/block/${startBlock}) to [${endBlock}](https://etherscan.io/block/${endBlock})\n\n`;

  for (const [
    delegatePlatformName,
    delegatePlatformFees,
  ] of delegatePlatformsFees) {
    const reportTable = markdownTable([
      [
        "Address",
        ...Object.values(FeesTypes).map((feetype) => feesTypesNames[feetype]),
        "**Total (ETH)**",
      ],
      ...Array.from(delegatePlatformFees.addressesFees).map(
        ([address, feesInfos]) => [
          address,
          ...Object.entries(feesInfos.fees).map(([, value]) => {
            return `${formatEther(value)}`;
          }),
          `**${formatEther(feesInfos.totalFees)}**`,
        ]
      ),
      [
        "**Total**",
        ...Object.entries(delegatePlatformFees.totalFeesInfos.fees).map(
          ([, value]) => {
            return `**${formatEther(value)}**`;
          }
        ),
        `**${formatEther(delegatePlatformFees.totalFeesInfos.totalFees)}**`,
      ],
    ]);
    report += `## ${delegatePlatformName}\n\n`;
    report += `${reportTable}\n\n`;
  }

  const dirPath = "./out/reports";
  const filename = "gas-report.md";
  const path = `${dirPath}/${filename}`;

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path, report);
  console.log(`✅ Report generated at ${path}`);
};
