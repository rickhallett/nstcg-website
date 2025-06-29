**VARIANT GENERATION COMMAND**

This command generates content based on a specification.

**Variables:**

spec_file: $ARGUMENTS
output_dir: $ARGUMENTS
count: $ARGUMENTS

**ARGUMENTS PARSING:**
Parse the following arguments from "$ARGUMENTS":
1. `spec_file` - Path to the markdown specification file
2. `output_dir` - Directory where iterations will be saved  
3. `count` - Number of iterations to generate

**PHASE 1: SPECIFICATION ANALYSIS**
Read and understand the specification file at `spec_file`. This file defines:
- What type of content to generate
- The format and structure requirements
- Any specific parameters or constraints

**PHASE 2: OUTPUT DIRECTORY RECONNAISSANCE** 
Analyze the `output_dir` to understand the current state:
- List all existing files and their naming patterns
- Identify the highest iteration number currently present

**PHASE 3: ITERATION STRATEGY**
Based on the spec analysis and existing iterations:
- Determine the starting iteration number (highest existing + 1)
- Plan how each new iteration will be unique.

**PHASE 4: PARALLEL EXECUTION**
Deploy multiple Sub Agents to generate iterations in parallel.

**Sub-Agent Distribution Strategy:**
- For count 1-5: Launch all agents simultaneously 
- For count > 5: Launch in batches of 5 agents.

**Agent Assignment Protocol:**
Each Sub Agent receives:
1. **Spec Context**: Complete specification file analysis
2. **Directory Snapshot**: Current state of output_dir at launch time
3. **Iteration Assignment**: Specific iteration number (starting_number + agent_index)
4. **Uniqueness Directive**: Explicit instruction to avoid duplicating concepts from existing iterations
5. **Quality Standards**: Detailed requirements from the specification

**Agent Task Specification:**
```
TASK: Generate iteration [NUMBER] for [SPEC_FILE] in [OUTPUT_DIR]

You are Sub Agent [X] generating iteration [NUMBER]. 

CONTEXT:
- Specification: [Full spec analysis]
- Existing iterations: [Summary of current output_dir contents]
- Your iteration number: [NUMBER]

REQUIREMENTS:
1. Read and understand the specification completely
2. Analyze existing iterations to ensure your output is unique
3. Generate content following the spec format exactly
4. Create file with exact name pattern specified
5. Ensure your iteration adds genuine value and novelty
6. Include a working countdown timer that:
   - Updates every second
   - Shows days, hours, minutes, and seconds
   - Is set to 30 days from the current date
   - Has a clear "expired" state when time runs out
7. Email confirmation must use theme-consistent HTML/CSS:
   - NO JavaScript alerts
   - Show success message in the page
   - Hide form or provide visual feedback
   - Auto-reset after 4-5 seconds

DELIVERABLE: Single file as specified, with unique innovative content, working timer, and theme-consistent confirmation
```

**Parallel Execution Management:**
- Launch all assigned Sub Agents simultaneously using Task tool
- Monitor agent progress and completion
- Handle any agent failures by reassigning iteration numbers
- Ensure no duplicate iteration numbers are generated
- Collect and validate all completed iterations

**PHASE 5: BATCH ORCHESTRATION**
For large-count generation, orchestrate parallel batches until the count is reached:

**Batch-Based Generation:**
1. **Batch Planning**: Determine next batch size (e.g., 5 agents)
2. **Agent Preparation**: Prepare context for each new batch
3. **Context Monitoring**: Track total context usage.
4. **Graceful Conclusion**: Complete current batch and summarize.

**Execution Cycle:**
```
WHILE generated_iterations < count:
    1. Assess current output_dir state
    2. Plan next batch of agents
    3. Launch parallel Sub Agent batch
    4. Monitor batch completion
    5. Update directory state snapshot
```

**EXECUTION PRINCIPLES:**

**Quality & Uniqueness:**
- Each iteration must be genuinely unique and valuable
- Maintain consistency with the original specification
- Ensure proper file organization and naming

**Parallel Coordination:**
- Deploy Sub Agents strategically to maximize creative diversity
- Assign distinct innovation dimensions to each agent to avoid overlap
- Coordinate timing to prevent file naming conflicts
- Monitor all agents for successful completion and quality

**Agent Management:**
- Provide each Sub Agent with complete context and clear assignments
- Handle agent failures gracefully with iteration reassignment
- Ensure all parallel outputs integrate cohesively.