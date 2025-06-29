Add reCAPTCHA to your website
Load the JavaScript API with your key.
```html
<head>
  <script src="https://www.google.com/recaptcha/enterprise.js?render=6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX"></script>
  <!-- Your code -->
</head>
Use a callback function to handle the response token.
<!-- Replace the variables below. -->
<script>
  function onSubmit(token) {
    document.getElementById("demo-form").submit();
  }
</script>
Add attributes to your HTML button:
<button class="g-recaptcha"
    data-sitekey="6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX"
    data-callback='onSubmit'
    data-action='submit'>
  Submit
</button>
```

Send the response token to your application backend. The response token expires after two minutes. Get the response token from the g-recaptcha-response POST parameter when the user submits the form on your site.

Verify the reCAPTCHA token
Submit the generated response token to reCAPTCHA for verification. reCAPTCHA returns a risk score indicating the likelihood of a legitimate interaction.

Note:Before proceeding, you must authenticate with reCAPTCHA. API requests to reCAPTCHA will fail until authentication steps are complete.

```javascript
const {RecaptchaEnterpriseServiceClient} = require('@google-cloud/recaptcha-enterprise');

/**
  * Create an assessment to analyze the risk of a UI action.
  *
  * projectID: Your Google Cloud Project ID.
  * recaptchaSiteKey: The reCAPTCHA key associated with the site/app
  * token: The generated token obtained from the client.
  * recaptchaAction: Action name corresponding to the token.
  */
async function createAssessment({
  // TODO: Replace the token and reCAPTCHA action variables before running the sample.
  projectID = "nstcg-org",
  recaptchaKey = "6LdmSm4rAAAAAGwGVAsN25wdZ2Q2gFoEAtQVt7lX",
  token = "action-token",
  recaptchaAction = "action-name",
}) {
  // Create the reCAPTCHA client.
  // TODO: Cache the client generation code (recommended) or call client.close() before exiting the method.
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);

  // Build the assessment request.
  const request = ({
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey,
      },
    },
    parent: projectPath,
  });

  const [ response ] = await client.createAssessment(request);

  // Check if the token is valid.
  if (!response.tokenProperties.valid) {
    console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`);
    return null;
  }

  // Check if the expected action was executed.
  // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
  if (response.tokenProperties.action === recaptchaAction) {
    // Get the risk score and the reason(s).
    // For more information on interpreting the assessment, see:
    // https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
    console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);
    response.riskAnalysis.reasons.forEach((reason) => {
      console.log(reason);
    });

    return response.riskAnalysis.score;
  } else {
    console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
    return null;
  }
}
```