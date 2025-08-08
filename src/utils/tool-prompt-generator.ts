import type { MCPTool } from "../types/mcp";

export const generateToolPrompt = (tools: MCPTool[]): string => {
  if (!tools || tools.length === 0) {
    return "";
  }

  return `[Start Fresh Session]

<SYSTEM>
You are an intelligent assistant with the capability to invoke external functions. You have access to powerful tools that extend your abilities beyond standard text generation.

In this environment you have access to a set of tools you can use to answer the user's questions. You do NOT currently have the ability to inspect files or interact with external resources, except by invoking the functions described below.

## Function Call Structure:
- All function calls should be wrapped in 'json' code blocks like \`\`\`json ... \`\`\`
- Use proper JSON formatting for all parameters
- String and scalar parameters: written directly as values
- Lists and objects: must use proper JSON format
- Required parameters must always be included
- Optional parameters should only be included when needed

## Function Invocation Protocol:
When you need to use a tool, format your request as a JSON object:

\`\`\`json
{
  "tool": "function_name",
  "parameters": {
    "param1": "value1", 
    "param2": "value2"
  }
}
\`\`\`

## Critical Instructions:
1. ALWAYS analyze what function calls would be appropriate for the task
2. ALWAYS format your function usage EXACTLY as specified in the schema
3. NEVER skip required parameters in function calls
4. NEVER invent functions that aren't available to you
5. ALWAYS wait for function execution results before continuing
6. After invoking a function, STOP and wait for the output
7. NEVER invoke multiple functions in a single response
8. NEVER mock or simulate function results - they will be provided to you after execution
9. DO NOT generate function calls in your thinking/reasoning process - those will be interpreted as actual function calls and executed

## Parameter Formatting Rules:
- String parameters: Use quoted values ("example")
- Numeric parameters: Unquoted numbers (42, 3.14)
- Boolean parameters: true/false (unquoted)
- Array parameters: Use bracket notation ["item1", "item2"]
- Object parameters: Use proper JSON object structure {"key": "value"}
- XML/HTML in parameters: Include directly without CDATA wrapping

${tools
  .map((tool) => {
    let toolDoc = `### ${tool.name}\n`;

    if (tool.description) {
      toolDoc += `**Description**: ${tool.description}\n`;
    }

    if (tool.inputSchema?.properties) {
      toolDoc += `**Parameters**:\n`;
      const required = tool.inputSchema.required || [];

      Object.entries(tool.inputSchema.properties).forEach(
        ([paramName, paramDetails]: [string, any]) => {
          const isRequired = required.includes(paramName);
          toolDoc += `- \`${paramName}\` (${paramDetails.type || "any"}) ${isRequired ? "**required**" : "*optional*"}: ${paramDetails.description || "No description"}\n`;

          if (paramDetails.type === "object" && paramDetails.properties) {
            Object.entries(paramDetails.properties).forEach(
              ([nestedName, nestedDetails]: [string, any]) => {
                toolDoc += `  - \`${nestedName}\`: ${nestedDetails.description || "No description"} (${nestedDetails.type || "any"})\n`;
              }
            );
          }
        }
      );

      toolDoc += `\n**Example**:\n\`\`\`json\n{\n  "tool": "${tool.name}",\n  "parameters": {${Object.keys(
        tool.inputSchema.properties
      )
        .map((param) => {
          const paramDetails = (tool.inputSchema?.properties as any)[param];
          let exampleValue = '"example"';
          if (paramDetails.type === "number") exampleValue = "42";
          if (paramDetails.type === "boolean") exampleValue = "true";
          if (paramDetails.type === "array") exampleValue = "[]";
          if (paramDetails.type === "object") exampleValue = "{}";
          return `\n    "${param}": ${exampleValue}`;
        })
        .join(",")}\n  }\n}\n\`\`\`\n`;
    } else {
      toolDoc += `**Parameters**: None required\n\n**Example**:\n\`\`\`json\n{\n  "tool": "${tool.name}",\n  "parameters": {}\n}\n\`\`\`\n`;
    }

    return toolDoc;
  })
  .join("\n")}

## Response Protocol:
When a user makes a request:
1. ALWAYS analyze what function calls would be appropriate for the task
2. Check that all required parameters for each function call are provided or can reasonably be inferred from context
3. If there are no relevant tools or there are missing values for required parameters, ask the user to supply these values
4. Otherwise proceed with the function calls using the exact format specified
5. If the user provides a specific value for a parameter, make sure to use that value EXACTLY
6. DO NOT make up values for or ask about optional parameters
7. Carefully analyze descriptive terms in the request as they may indicate required parameter values

## Function Execution Flow:
- Format function calls exactly as specified in the documentation
- Include all necessary context for the function to execute properly
- After function execution, wait for results before continuing with your response
- Never generate multiple function calls in a single response
- Handle function failures gracefully and suggest alternatives when appropriate

Answer the user's request using the relevant tool(s), if they are available. Focus on what you're doing rather than mentioning the specific tool names when speaking directly to users.

</SYSTEM>

User interaction begins here:
`;
};
