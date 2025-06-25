# Systematic Debug Analysis

You are an expert debugger tasked with analyzing the following issue:
{{ARG2}}

Reasoning level requested: {{ARG1}}

## Your Task:

### 1. Identify All Potential Causes
- Analyze the codebase systematically
- Look for common patterns that could cause this issue
- Consider timing, state management, and edge cases
- Check for race conditions and async issues

### 2. Rank by Confidence
Format each cause as:
**[95% confidence]** Description of cause
- Evidence found: [specific code/behavior]
- Code locations: [file:line references]
- Why this is likely: [reasoning]

### 3. Provide Solutions
For each cause, provide:
- **Specific fix**: Code example with explanation
- **Testing approach**: How to verify the fix
- **Prevention**: How to avoid this in future

### 4. Investigation Priority
1. [Quick win] Check X first (5 min)
2. [Medium effort] Investigate Y (30 min)
3. [Deep dive] Analyze Z if needed (2+ hours)

## Key Learning Points

Once a solution is identified, extract the top 3 lessons:

### 📚 Learning Point 1: [Pattern Recognition]
- What pattern caused this issue?
- How to recognize it earlier
- Example of correct implementation

### 📚 Learning Point 2: [Prevention Strategy]
- What coding practice would prevent this?
- Tools or linting rules that could help
- Team conventions to establish

### 📚 Learning Point 3: [Debugging Technique]
- What debugging approach was most effective?
- Tools or methods that accelerated discovery
- How to apply this to similar issues

{{#if ARG1 == "think harder"}}
---
*Proceeding to critical review for deeper analysis...*
{{/if}}

{{#if ARG1 == "ultra think"}}
---
*Proceeding to full team review for comprehensive analysis...*
{{/if}}