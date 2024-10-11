import { markdownTable } from "markdown-table";
import fs from "fs";
import { DelegatePlatformFees } from "@/gas-tracker";
import { formatEther } from "viem";

export const generateReport = (
  delegatePlatformsFees: DelegatePlatformFees[]
) => {
  let report = `# Delegate Platform Gas Report\n\n`;

  for (const delegatePlatformFees of delegatePlatformsFees) {
    const reportTable = markdownTable([
      ["Address", "Gas Used (ETH)"],
      ...delegatePlatformFees.addresses.map((addressGasInfo) => [
        addressGasInfo.address,
        formatEther(addressGasInfo.gasUsed),
      ]),
    ]);
    report += `## ${delegatePlatformFees.name}\n\n`;
    report += `${reportTable}\n\n`;
  }

  console.log(report);

  const dirPath = "./out/reports";
  const filename = "gas-report.md";

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(`${dirPath}/${filename}`, report);
  console.log(`✅ Report generated at ${filename}`);
};
