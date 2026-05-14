export const demoAIAnalysis = {
  summary:
    "The v2.3.0 release shows significant improvement across all test cases, with pass rate jumping from 0% to 83%. The primary improvement comes from enhanced empathy expressions, more detailed resolution options, and proper escalation paths. One remaining failure case (product defect report) needs attention in the next iteration.",
  regressionPatterns: [
    "v2.2.0 responses were uniformly brief and dismissive, suggesting insufficient system prompt guidance for empathy",
    "All v2.2.0 failures share a pattern of missing process explanation and resolution options",
  ],
  suggestedFixes: [
    "For tc-1-4 (product defect): Add warranty coverage explanation and claim process details to the system prompt",
    "Consider adding a 'resolution completeness' checklist to ensure all required elements are present",
    "The model upgrade from Haiku to Sonnet appears to be the primary quality driver - verify this in further tests",
  ],
  riskAssessment: "low" as const,
};
