Pulumi configuration offers a robust mechanism for managing runtime parameters and sensitive data for your infrastructure deployments. This includes the crucial task of encrypting and securely managing secrets, which are values that should not be exposed in plain text within your code or state files, such as API keys, database connection strings, or private certificates. Pulumi integrates with various secret providers to ensure these values are encrypted at rest and only decrypted when needed during a deployment.

## Pulumi Configuration Fundamentals

Pulumi projects use a `Pulumi.yaml` file to define the project and a `Pulumi.<stack-name>.yaml` file for stack-specific configuration. These configuration files are where you store key-value pairs that your Pulumi program can access. Values stored in these files can be either plain text or encrypted secrets.

### Setting Configuration Values

Configuration values are set using the Pulumi CLI. When setting a value, you specify the key and the value. For example, to set a non-secret configuration value:

bash

```
pulumi config set azure-native:location WestUS2
```

This command adds `azure-native:location: WestUS2` to your `Pulumi.<stack-name>.yaml` file. The `azure-native:location` key uses a standard naming convention where the first part often refers to the provider or a logical grouping.

Your TypeScript program accesses this value using `pulumi.Config`.

typescript

```
import * as pulumi from "@pulumi/pulumi";const config = new pulumi.Config();const location = config.require("azure-native:location"); // Requires the value to be presentconsole.log(`Deploying resources to: ${location}`);
```

Using `config.require("key")` ensures that an error is thrown if the configuration value is not found, making your infrastructure code more robust. If a default value or optionality is desired, `config.get("key")` can be used, which returns `undefined` if the key is not present.

### Encrypting Secrets

To set an encrypted secret, you use the `--secret` flag with `pulumi config set`.

bash

```
pulumi config set --secret myapp:dbPassword "SuperSecurePassword123!"
```

When you run this command, Pulumi will prompt you for the secret value if it's not provided directly on the command line, or it will encrypt the provided string. The `Pulumi.<stack-name>.yaml` file will then contain the encrypted value. For example:

yaml

```
config:  azure-native:location: WestUS2  myapp:dbPassword:    secure: v1:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The `secure:` prefix indicates that the value is encrypted. The actual encryption key used depends on the chosen secrets provider. By default, Pulumi Service stores secrets encrypted with a per-stack key, or if using local state, a passphrase-protected local key.

Accessing a secret in your TypeScript program is similar to accessing a regular configuration value, but you use `config.requireSecret` or `config.getSecret`.

typescript

```
import * as pulumi from "@pulumi/pulumi";const config = new pulumi.Config();const dbPassword = config.requireSecret("myapp:dbPassword");// dbPassword is now an Output<string> that contains the decrypted secret// This Output can be passed directly to resource properties that expect a string,// and Pulumi will handle the decryption securely during deployment.// Example: Using the secret for a database connection string// In a real scenario, you'd pass this to a resource like an Azure SQL Database,// a Function App setting, or a Key Vault secret.// For demonstration, we'll just show its type, as directly logging a secret is generally discouraged.dbPassword.apply(password => console.log(`DB Password (do not log in production!): [SECRET HASH]`));
```

The `dbPassword` variable is of type `pulumi.Output<string>`. Pulumi's `Output` type is fundamental for handling asynchronous operations and managing sensitive data. It ensures that the secret value is never directly exposed in plain text within your program's execution flow or the Pulumi state file. When you pass an `Output<string>` to a resource property, Pulumi handles the decryption and injection of the actual secret value into the cloud provider during the `pulumi up` operation.

### Understanding Pulumi Secret Providers

Pulumi supports different backends for managing the encryption keys used for secrets. The default behavior depends on your Pulumi backend.

- **Pulumi Service (SaaS backend):** When using the Pulumi Service, secrets are encrypted using a per-stack encryption key managed securely by the Pulumi Service itself. This is the most common and recommended approach for teams. You don't need to configure a master key or passphrase directly.
- **Azure Blob Storage (or S3, GCS):** If you are using a cloud storage backend for your state (as discussed in Module 4, Lesson 1), Pulumi still needs an encryption key for secrets. By default, it will prompt you for a passphrase to derive a local encryption key. Alternatively, you can configure a cloud-specific Key Management Service (KMS).
- **Local Filesystem:** When using local state, Pulumi will prompt for a passphrase to encrypt and decrypt secrets. This passphrase is critical and must be remembered. Losing it means losing access to your encrypted secrets.

### Configuring a Cloud KMS for Secrets

For enhanced security and centralized key management, Pulumi can integrate with cloud Key Management Services (KMS). For Azure, this means using Azure Key Vault. Using a KMS service provides several advantages:

- **Centralized Key Management:** Encryption keys are managed by a dedicated, highly secure service.
- **Auditing and Access Control:** Detailed logging of key usage and granular permissions.
- **Automatic Key Rotation:** Many KMS services offer automatic key rotation policies.

To configure Pulumi to use Azure Key Vault for secret encryption:

1. **Create an Azure Key Vault:** You need an existing Azure Key Vault instance. In a real-world scenario, you might even deploy this Key Vault using Pulumi itself, but for secrets management, it often needs to exist beforehand or be managed separately for bootstrap purposes. Ensure the Pulumi CLI principal (the identity running `pulumi up`) has appropriate permissions to encrypt and decrypt with the Key Vault.
    
2. **Configure Pulumi for Azure Key Vault:** Set the `PULUMI_SECRETS_PROVIDER` environment variable or configure it in your `Pulumi.yaml`.
    
    bash
    
    ```
    # Set as environment variable for the current shell sessionexport PULUMI_SECRETS_PROVIDER="azurekeyvault://<keyvault-name>.vault.azure.net/keys/<key-name>/<key-version>"# Or, in your Pulumi.yaml (preferred for project-level consistency)# Pulumi.yaml# name: my-project# runtime: nodejs# description: My Pulumi Azure project# secretsProvider: azurekeyvault://<keyvault-name>.vault.azure.net/keys/<key-name>/<key-version>
    ```
    
    Replace `<keyvault-name>`, `<key-name>`, and `<key-version>` with your specific Key Vault details. The `<key-version>` is optional; if omitted, Pulumi uses the latest version of the key.
    

Once configured, any secrets set with `pulumi config set --secret` will use the specified Azure Key Vault key for encryption and decryption.

## Practical Example: Deploying an Azure Function with an API Key

Consider an Azure Function App that needs to securely store an API key for an external service. We will store this API key as a Pulumi secret and inject it into the Function App's application settings.

### Step 1: Initialize a Pulumi Project

If you don't have one, create a new Pulumi Azure TypeScript project:

bash

```
mkdir azure-function-secretscd azure-function-secretspulumi new azure-typescript --dir .
```

### Step 2: Set the Secret and Configuration

Set the API key as a Pulumi secret and a location for our resources.

bash

```
pulumi config set --secret myfunction:externalApiKey "super-secret-external-api-key-123"pulumi config set azure-native:location WestUS2
```

Your `Pulumi.dev.yaml` (assuming a 'dev' stack) will now look something like this:

yaml

```
config:  azure-native:location: WestUS2  myfunction:externalApiKey:    secure: v1:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: Implement the Infrastructure Code

Modify your `index.ts` to deploy an Azure Function App and pass the secret as an application setting.

typescript

```
import * as pulumi from "@pulumi/pulumi";import * as resources from "@pulumi/azure-native/resources";import * as storage from "@pulumi/azure-native/storage";import * as web from "@pulumi/azure-native/web";import * as appservice from "@pulumi/azure-native/web/v20220301";const config = new pulumi.Config();const location = config.require("azure-native:location");const externalApiKey = config.requireSecret("myfunction:externalApiKey");// Create an Azure Resource Groupconst resourceGroup = new resources.ResourceGroup("rg-function-secrets", {    location: location,});// Create an Azure Storage Account for the Function Appconst storageAccount = new storage.StorageAccount("stfunctionsecrets", {    resourceGroupName: resourceGroup.name,    location: resourceGroup.location,    sku: {        name: storage.SkuName.Standard_LRS,    },    kind: storage.Kind.StorageV2,});// Create an App Service Plan for the Function Appconst appServicePlan = new web.AppServicePlan("asp-function-secrets", {    resourceGroupName: resourceGroup.name,    location: resourceGroup.location,    sku: {        name: "Y1", // Free tier for Linux Consumption Plan        tier: "Dynamic",    },    kind: "FunctionApp",});// Create the Function App itselfconst functionApp = new web.WebApp("fa-function-secrets", {    resourceGroupName: resourceGroup.name,    location: resourceGroup.location,    serverFarmId: appServicePlan.id,    kind: "FunctionApp",    // Configure application settings, including the secret API key    siteConfig: {        appSettings: [            { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" }, // Or whatever runtime your function uses            { name: "AzureWebJobsStorage", value: storageAccount.primaryConnectionString },            { name: "WEBSITE_RUN_FROM_PACKAGE", value: "1" }, // Run from deployment package            { name: "EXTERNAL_API_KEY", value: externalApiKey }, // Pass the secret here        ],    },    // Optionally, configure CORS, deployment source, etc.});// Export the Function App hostnameexport const functionAppHostname = functionApp.defaultHostName;
```

### Step 4: Deploy the Infrastructure

Run `pulumi up` to deploy your Function App. Pulumi will handle the decryption of `externalApiKey` and securely pass its value to Azure as an application setting. The actual value of `EXTERNAL_API_KEY` will appear as `******` in the Pulumi `up` preview for security.

bash

```
pulumi up
```

### Step 5: Verify the Secret in Azure

After deployment, navigate to your Function App in the Azure portal. Go to "Configuration" -> "Application settings." You will see an entry for `EXTERNAL_API_KEY`. When viewing its value, Azure will initially mask it. You can reveal it, but it demonstrates that the secret was passed securely.

## Updating Secrets

If you need to change a secret value, simply use `pulumi config set --secret <key>` again with the new value.

bash

```
pulumi config set --secret myfunction:externalApiKey "new-super-secret-api-key-456"
```

Running `pulumi up` afterward will detect the change and update the corresponding resource property (e.g., the Function App's application setting) in Azure.

## Removing Secrets

To remove a secret from your Pulumi configuration, use `pulumi config rm <key>`.

bash

```
pulumi config rm myfunction:externalApiKey
```

After removing the secret, run `pulumi up`. Pulumi will recognize that the configuration value is no longer present and will typically remove the corresponding setting from your cloud resource, depending on how that resource's schema handles missing properties.

## Best Practices for Secrets Management

- **Use Pulumi Secrets:** Always store sensitive data as Pulumi secrets. Avoid hardcoding secrets in your code or committing them in plain text to version control.
- **Leverage Cloud KMS:** For production environments and team collaboration, integrate with Azure Key Vault (or another cloud KMS) for robust key management.
- **Granular Access Control:** Ensure that only authorized personnel and CI/CD pipelines have permission to access and decrypt secrets.
- **Audit Trails:** Utilize the auditing capabilities of your chosen secrets provider (Pulumi Service or Azure Key Vault) to track access and usage of secrets.
- **Regular Rotation:** Implement a strategy for regularly rotating secrets. While Pulumi helps in deploying changed secrets, the rotation policy should be part of your security strategy.
- **Avoid Logging Secrets:** As demonstrated, be extremely cautious about logging secret values directly. Pulumi's `Output` type helps prevent accidental exposure in logs.
- **Secrets vs. Configuration:** Distinguish between true secrets (e.g., passwords, API keys) and general configuration parameters (e.g., region, resource prefixes). Only encrypt actual secrets.