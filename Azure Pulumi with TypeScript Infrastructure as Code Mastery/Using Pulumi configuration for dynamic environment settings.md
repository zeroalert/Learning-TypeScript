Pulumi configuration provides a robust mechanism to manage settings and parameters that change across different environments or for various deployments of the same project. Rather than hardcoding values directly into your infrastructure code, you can externalize them, making your Pulumi projects more flexible, reusable, and easier to manage. This approach is particularly useful for values like resource names, sizes, region choices, or specific application settings that vary between development, staging, and production environments, or even between different feature branches.

## Understanding Pulumi Configuration Basics

Pulumi configuration relies on key-value pairs associated with a specific stack. When you run `pulumi up`, Pulumi looks for configuration values defined for the active stack. These values can be accessed within your TypeScript code to dynamically provision resources.

### Setting Configuration Values

Configuration values are typically set using the Pulumi CLI. The `pulumi config set` command assigns a value to a key for the currently active stack.

**Example 1: Setting a simple string value**

Imagine you want to control the name prefix for your Azure resources. You can define a configuration key called `resourcePrefix`.

bash

```
pulumi config set resourcePrefix myapp
```

This command sets the value `myapp` for the `resourcePrefix` key on your current stack. If you switch to a different stack, this value will not be present unless you set it there too.

**Example 2: Setting a numerical value**

For scaling purposes, you might want to configure the number of instances for a VM Scale Set or the capacity of a queue.

bash

```
pulumi config set vmCount 2
```

This sets the `vmCount` configuration key to `2`.

**Example 3: Setting a boolean value**

Sometimes you need a simple on/off switch for certain features or resource deployments.

bash

```
pulumi config set enableMonitoring true
```

This sets `enableMonitoring` to `true`.

### Accessing Configuration Values in TypeScript

Within your Pulumi TypeScript program, you use the `pulumi.Config` class to retrieve these values. An instance of `pulumi.Config` allows you to fetch values by their key.

typescript

```
import * as pulumi from "@pulumi/pulumi";// Create a new Pulumi Config object.// If no name is provided, it defaults to the project name.const config = new pulumi.Config();// Retrieve a string configuration value.// The .require() method will throw an error if the key is not set.const resourcePrefix = config.require("resourcePrefix");// Retrieve a number configuration value.// The .requireNumber() method ensures the value is a number and throws if not.const vmCount = config.requireNumber("vmCount");// Retrieve a boolean configuration value.// The .requireBoolean() method ensures the value is a boolean and throws if not.const enableMonitoring = config.requireBoolean("enableMonitoring");// You can also use .get() for optional configuration values.// If the key is not set, .get() returns undefined.const optionalTag = config.get("optionalTag");console.log(`Resource Prefix: ${resourcePrefix}`);console.log(`VM Count: ${vmCount}`);console.log(`Monitoring Enabled: ${enableMonitoring}`);console.log(`Optional Tag: ${optionalTag}`);
```

### Configuration Files

When you use `pulumi config set`, Pulumi saves these settings in a file named `Pulumi.<stack-name>.yaml` in your project directory. For instance, if your stack is named `dev`, the file would be `Pulumi.dev.yaml`. This file stores all configuration keys and their values for that specific stack.

**Example `Pulumi.dev.yaml` content:**

yaml

```
config:  azure-pulumi-typescript:resourcePrefix: myapp-dev  azure-pulumi-typescript:vmCount: "2"  azure-pulumi-typescript:enableMonitoring: "true"  azure-pulumi-typescript:region: EastUSsecrets_providers:  type: passphrase
```

Notice how `azure-pulumi-typescript:` is prefixed to the keys. This is the project name, ensuring unique keys across multiple projects if configuration files were merged. Pulumi automatically handles this prefixing.

### Overriding Configuration Values

Configuration values can be overridden. The hierarchy is as follows:

1. **Command-line flags:** `-c key=value` takes highest precedence.
2. **Environment variables:** `PULUMI_CONFIG_<KEY>=value` can be used.
3. **Stack configuration file:** `Pulumi.<stack-name>.yaml`.

This allows for flexible overriding, especially in CI/CD pipelines where you might want to temporarily override a value without modifying the `Pulumi.<stack-name>.yaml` file.

## Dynamic Resource Provisioning with Configuration

Using configuration, you can dynamically adjust resource properties based on the environment. This prevents you from writing conditional logic directly into your infrastructure code for environment-specific settings.

### Real-World Example 1: Environment-Specific Azure Region

A common requirement is to deploy resources to different Azure regions depending on the environment. Development might use `EastUS`, while production might use `WestUS` for lower latency to customers in a specific geographical area.

1. **Set configuration for different stacks:**
    
    bash
    
    ```
    # For 'dev' stackpulumi stack select devpulumi config set azure-native:location EastUSpulumi config set resourceSku Standard_LRS# For 'prod' stackpulumi stack select prodpulumi config set azure-native:location WestUSpulumi config set resourceSku Premium_LRS
    ```
    
    _Note: `azure-native:location` is a special Pulumi configuration key that sets the default location for Azure resources in the `azure-native` provider._
    
2. **Access configuration in TypeScript:**
    
    typescript
    
    ```
    import * as pulumi from "@pulumi/pulumi";import * as azure_native from "@pulumi/azure-native";const config = new pulumi.Config();const storageAccountSku = config.require("resourceSku"); // e.g., Standard_LRS or Premium_LRS// The location is automatically picked up by the azure-native provider// if azure-native:location is set in config.// However, you can also explicitly retrieve it if needed for custom logic:const location = config.require("azure-native:location");// Create an Azure Resource Group using the configured locationconst resourceGroup = new azure_native.resources.ResourceGroup("my-resource-group", {    location: location,});// Create an Azure Storage Account with dynamic SKU and locationconst storageAccount = new azure_native.storage.StorageAccount("mystorageaccount", {    resourceGroupName: resourceGroup.name,    location: resourceGroup.location, // Inherit location from resource group    sku: {        name: storageAccountSku,    },    kind: "StorageV2",});export const storageAccountName = storageAccount.name;export const storageAccountLocation = storageAccount.location;
    ```
    
    When you run `pulumi up` on the `dev` stack, the storage account will be `Standard_LRS` in `EastUS`. When you switch to `prod` and run `pulumi up`, it will be `Premium_LRS` in `WestUS`.
    

### Real-World Example 2: Application Settings for Different Environments

Consider an application that connects to different backend API endpoints or has varying log levels based on whether it's in development or production.

1. **Set configuration:**
    
    bash
    
    ```
    # For 'dev' stackpulumi stack select devpulumi config set apiEndpoint https://dev.api.example.com/pulumi config set logLevel debug# For 'prod' stackpulumi stack select prodpulumi config set apiEndpoint https://prod.api.example.com/pulumi config set logLevel info
    ```
    
2. **Access configuration in TypeScript and provision Azure App Service with these settings:**
    
    typescript
    
    ```
    import * as pulumi from "@pulumi/pulumi";import * as azure_native from "@pulumi/azure-native";const config = new pulumi.Config();const apiEndpoint = config.require("apiEndpoint");const logLevel = config.require("logLevel");const resourceGroup = new azure_native.resources.ResourceGroup("app-resource-group");const appServicePlan = new azure_native.web.AppServicePlan("app-plan", {    resourceGroupName: resourceGroup.name,    kind: "Linux",    reserved: true,    sku: {        name: "B1", // Basic tier for demo    },});const app = new azure_native.web.WebApp("my-webapp", {    resourceGroupName: resourceGroup.name,    serverFarmId: appServicePlan.id,    siteConfig: {        appSettings: [            { name: "API_ENDPOINT", value: apiEndpoint },            { name: "LOG_LEVEL", value: logLevel },            // Other application settings        ],    },});export const appServiceUrl = app.defaultHostName;
    ```
    
    This approach allows the same Pulumi code to deploy the web application with different environment variables based on the active stack, facilitating smooth transitions from development to production.
    

### Hypothetical Scenario: Feature Flag Deployment

Imagine a scenario where a new feature is under development and should only be deployed to a specific testing environment or enabled for internal users, not yet for general production traffic.

1. **Define a feature flag in configuration:**
    
    bash
    
    ```
    # For 'feature-test' stackpulumi stack select feature-testpulumi config set enableNewFeature true# For 'prod' stackpulumi stack select prodpulumi config set enableNewFeature false
    ```
    
2. **Conditional resource deployment in TypeScript:**
    
    typescript
    
    ```
    import * as pulumi from "@pulumi/pulumi";import * as azure_native from "@pulumi/azure-native";const config = new pulumi.Config();const enableNewFeature = config.requireBoolean("enableNewFeature");const resourceGroup = new azure_native.resources.ResourceGroup("my-app-rg");// Only deploy a specific Azure Function or API Gateway route if the feature flag is trueif (enableNewFeature) {    const newFeatureFunctionApp = new azure_native.web.WebApp("new-feature-func-app", {        resourceGroupName: resourceGroup.name,        kind: "FunctionApp",        // ... other function app configurations    });    pulumi.log.info("New feature components are being deployed.");} else {    pulumi.log.info("New feature components are NOT being deployed.");}// Existing core application components (always deployed)const coreAppService = new azure_native.web.WebApp("core-app-service", {    resourceGroupName: resourceGroup.name,    // ... core app configurations});
    ```
    
    This setup enables robust A/B testing or gradual rollout strategies, allowing you to control resource deployment without altering the fundamental infrastructure code.
    

## Exercises and Practice Activities

These exercises will build upon the examples and reinforce your understanding of Pulumi configuration.

### Exercise 1: Configurable VM Size and Disk Type

Modify the VM deployment code to use configuration values for the VM size and OS disk type.

1. **Initialize a new Pulumi project** or use an existing one.
2. **Create a `dev` stack and a `prod` stack.**
3. **For the `dev` stack**, set the VM size to `Standard_B1ls` and the OS disk type to `Standard_LRS`.
    
    bash
    
    ```
    pulumi stack select devpulumi config set vmSize Standard_B1lspulumi config set osDiskType Standard_LRS
    ```
    
4. **For the `prod` stack**, set the VM size to `Standard_D2s_v3` and the OS disk type to `Premium_LRS`.
    
    bash
    
    ```
    pulumi stack select prodpulumi config set vmSize Standard_D2s_v3pulumi config set osDiskType Premium_LRS
    ```
    
5. **Write TypeScript code** to deploy an Azure Virtual Machine. The VM size and OS disk type should be retrieved from Pulumi configuration. _Hint: You'll need `azure-native.compute.VirtualMachine` and `azure-native.network.VirtualNetwork`, `Subnet`, `NetworkInterface`, `PublicIPAddress`._
6. **Deploy to both stacks** and observe the different VM configurations.
7. **Verify** the VM size and disk type in the Azure portal for each deployed VM.

### Exercise 2: Environment-Specific Storage Container Name

Extend the storage account example to create a blob container whose name includes an environment suffix.

1. **Use your existing project** from Exercise 1 or start a new one.
2. **Ensure you have `dev` and `prod` stacks.**
3. **Set an `environmentSuffix`** configuration key for each stack. For `dev`, set it to `-dev`, and for `prod`, set it to `-prod`.
    
    bash
    
    ```
    pulumi stack select devpulumi config set environmentSuffix -devpulumi stack select prodpulumi config set environmentSuffix -prod
    ```
    
4. **Modify your TypeScript code** to create an Azure Storage Account and then a Blob Container within it. The container name should dynamically incorporate the `environmentSuffix` (e.g., `mydata-dev` or `mydata-prod`). _Hint: You'll need `azure-native.storage.BlobContainer`._
5. **Deploy to both stacks** and verify the container names in the Azure portal.