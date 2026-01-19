Azure App Services provide a fully managed platform for building, deploying, and scaling web applications, APIs, and mobile backends. This Platform as a Service (PaaS) offering abstracts away the underlying infrastructure, allowing developers to focus purely on application code. With Pulumi and TypeScript, you can define, deploy, and manage Azure App Service resources declaratively, integrating web application hosting directly into your infrastructure as code strategy.

## Understanding Azure App Service Components

Deploying a web application on Azure App Services involves several key components that work together. Understanding these components is essential for effective Pulumi deployment.

### App Service Plan

An App Service Plan defines the underlying computing resources for your web applications. It specifies the region, operating system (Windows or Linux), and pricing tier (e.g., Free, Shared, Basic, Standard, Premium, Isolated). Multiple App Services can share a single App Service Plan, which allows you to host multiple applications on the same set of compute resources, optimizing costs and resource utilization. Scaling an App Service Plan affects all applications within it.

For instance, consider a company, "Contoso Corp," that wants to host several internal tools. They could create a single `Standard S1` App Service Plan in the `East US` region. This plan provides dedicated compute resources. Then, they could deploy their "Employee Directory" web application and their "Project Management Dashboard" web application into this _same_ App Service Plan. Both applications would share the CPU, memory, and disk space provided by the `Standard S1` plan. If either application experiences high traffic, scaling up the _plan_ (e.g., to `Standard S2`) would provide more resources for both.

### App Service Application

An App Service, also known as a Web App, is the actual instance where your application code runs. It's associated with an App Service Plan and hosts your application files, runtime settings, and deployment configurations. App Services can be configured with various settings like language runtime (Node.js, .NET, Python, Java, PHP, Ruby), environment variables, connection strings, and continuous deployment sources.

Continuing with Contoso Corp, after creating their App Service Plan, they would create an "Employee Directory" App Service and a "Project Management Dashboard" App Service. Each of these would be distinct Azure resources, but they would both point to the _same_ underlying App Service Plan. The Employee Directory App Service might be configured to run a Node.js application, while the Project Management Dashboard might use a .NET Core runtime. Each App Service would have its own URL (e.g., `employeedirectory.azurewebsites.net`), and its own specific application settings.

### Deployment Slots

Deployment slots are live apps with their own hostnames. They are connected to the same App Service Plan as the production slot. Using deployment slots allows you to deploy a new version of your application to a staging slot, test it thoroughly, and then swap it into production with zero downtime. This mechanism reduces risk during deployments and simplifies rollback if issues arise.

Contoso Corp wants to update their "Employee Directory" application. Instead of deploying directly to production, they create a "staging" deployment slot for their "Employee Directory" App Service. They deploy the new version of the application code to this staging slot. After internal testing and quality assurance on `employeedirectory-staging.azurewebsites.net`, they perform a slot swap. The new version in staging seamlessly becomes the production version, and the old production version moves to the staging slot, available for immediate rollback if necessary. This process happens without any users experiencing downtime on `employeedirectory.azurewebsites.net`.

## Deploying Azure App Services with Pulumi

Implementing Azure App Services with Pulumi involves defining these components in your TypeScript code.

### Prerequisites

Before deploying App Services, ensure you have:

- An existing Azure Resource Group, as discussed in Module 1. All resources will reside within this group.
- Pulumi installed and configured for Azure authentication.

### Basic App Service Deployment Example

This example demonstrates deploying an App Service Plan and a simple Node.js web application.

``` typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// Configuration for our App Service
const resourceGroupName = "pulumi-appservice-rg"; // Assuming this RG exists or is created
const location = "East US"; // Azure region for resources
const appServiceName = "my-webapp-example"; // Name for the App Service
const appServicePlanName = "my-appservice-plan"; // Name for the App Service Plan

// 1. Create an Azure Resource Group if it doesn't already exist.
// In a real scenario, this might be passed as an input or referenced from another stack.
// For this example, we'll create one.
const resourceGroup = new azure_native.resources.ResourceGroup(resourceGroupName, {
    resourceGroupName: resourceGroupName,
    location: location,
});

// 2. Create an App Service Plan
// This defines the underlying compute resources for our web application.
const appServicePlan = new azure_native.web.AppServicePlan(appServicePlanName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appServicePlanName,
    kind: "Windows", // Or "Linux" depending on your application's OS requirements
    sku: {
        name: "B1", // Basic tier, size B1. Choose based on your needs (e.g., S1 for Standard, P1V2 for Premium)
        tier: "Basic",
    },
    // For Linux, serverFarmId is sometimes used, but 'kind' and 'sku' are standard.
    // Ensure 'reserved' property is set to 'true' for Linux plans:
    // reserved: true, // Only for Linux App Service Plans
});

// 3. Create the App Service (Web App)
// This is where our application code will run. It references the App Service Plan.
const appService = new azure_native.web.WebApp(appServiceName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appServiceName,
    serverFarmId: appServicePlan.id, // Link to the App Service Plan
    siteConfig: {
        // Configure the runtime stack for your application
        // For Node.js:
        nodeVersion: "16-lts", // Specify Node.js version
        // For .NET Core:
        // netFrameworkVersion: "v6.0",
        // For Python:
        // pythonVersion: "3.9",
        appSettings: [
            // Example of an application setting (environment variable)
            {
                name: "WEBSITE_NODE_DEFAULT_VERSION",
                value: "~16", // Specify Node.js version
            },
            {
                name: "MY_CUSTOM_SETTING",
                value: "Hello from Pulumi!",
            },
        ],
    },
    // Enable HTTPs Only if required
    httpsOnly: true,
});

// Output the hostname of the App Service
export const endpoint = pulumi.interpolate`https://${appService.defaultHostName}`;
```

### Deploying with Application Insights

Application Insights is an extensible Application Performance Management (APM) service that monitors web applications. Integrating it with your App Service provides telemetry about application performance, availability, and usage.

``` typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const resourceGroupName = "pulumi-appservice-rg";
const location = "East US";
const appServiceName = "my-webapp-with-ai";
const appServicePlanName = "my-appservice-plan-ai";
const appInsightsName = "my-appinsights-ai";

const resourceGroup = new azure_native.resources.ResourceGroup(resourceGroupName, {
    resourceGroupName: resourceGroupName,
    location: location,
});

const appServicePlan = new azure_native.web.AppServicePlan(appServicePlanName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appServicePlanName,
    kind: "Windows",
    sku: { name: "B1", tier: "Basic" },
});

// Create an Application Insights instance
const appInsight = new azure_native.applicationinsights.Component(appInsightName,{

  resourceGroupName: resourceGroup.name,

  resourceName: appInsightName,

  location: resourceGroup.location,

  kind: "web",

  applicationType: "web",

  tags: {

    environment: "development",

    project: "web-app",

  }

})

const appService = new azure_native.web.WebApp(appServiceName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appServiceName,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        appSettings: [
            {
                name: "APPINSIGHTS_INSTRUMENTATIONKEY",
                // Reference the instrumentation key from the created App Insights component
                value: appInsights.instrumentationKey,
            },
            {
                name: "APPLICATIONINSIGHTS_CONNECTION_STRING",
                // Reference the connection string from App Insights (preferred for newer SDKs)
                value: appInsights.connectionString,
            },
            {
                name: "ApplicationInsightsAgent_EXTENSION_VERSION",
                value: "~2", // Enable Application Insights agent extension
            },
            // Other settings specific to your application (e.g., Node.js version)
            {
                name: "WEBSITE_NODE_DEFAULT_VERSION",
                value: "~16",
            },
        ],
    },
    httpsOnly: true,
});

export const appServiceEndpoint = pulumi.interpolate`https://${appService.defaultHostName}`;
export const appInsightsKey = appInsights.instrumentationKey;
```

This example creates an Application Insights instance and automatically configures the App Service with the necessary environment variables (`APPINSIGHTS_INSTRUMENTATIONKEY`, `APPLICATIONINSIGHTS_CONNECTION_STRING`, `ApplicationInsightsAgent_EXTENSION_VERSION`) to enable monitoring. Your application code, if using an Application Insights SDK, will then automatically send telemetry to this instance.

### Using Deployment Slots

Extending the previous example, let's add a staging slot.

``` typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const resourceGroupName = "pulumi-appservice-rg";
const location = "East US";
const appServiceName = "my-webapp-with-slots";
const appServicePlanName = "my-appservice-plan-slots";

const resourceGroup = new azure_native.resources.ResourceGroup(resourceGroupName, {
    resourceGroupName: resourceGroupName,
    location: location,
});

const appServicePlan = new azure_native.web.AppServicePlan(appServicePlanName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appServicePlanName,
    kind: "Linux", // Using Linux for this example
    sku: { name: "B1", tier: "Basic" },
    reserved: true, // Required for Linux App Service Plans
});

// The production App Service
const appService = new azure_native.web.WebApp(appServiceName, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appServiceName,
    serverFarmId: appServicePlan.id,
    siteConfig: {
        linuxFxVersion: "NODE|16-lts", // Linux-specific runtime setting
        appSettings: [
            { name: "APP_ENV", value: "Production" },
        ],
    },
    httpsOnly: true,
});

// Create a 'staging' deployment slot for the App Service
const stagingSlot = new azure_native.web.WebAppSlot("staging-slot", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    name: appService.name, // The name of the parent App Service
    slot: "staging", // The name of the slot
    serverFarmId: appServicePlan.id,
    siteConfig: {
        linuxFxVersion: "NODE|16-lts",
        appSettings: [
            { name: "APP_ENV", value: "Staging" }, // Differentiate settings for staging
        ],
    },
    httpsOnly: true,
});

export const productionEndpoint = pulumi.interpolate`https://${appService.defaultHostName}`;
export const stagingEndpoint = pulumi.interpolate`https://${stagingSlot.defaultHostName}`;
```

After deploying this code with `pulumi up`, you will have:

- A production web app accessible via `productionEndpoint`.
- A staging web app accessible via `stagingEndpoint`. You can deploy different versions of your application code to each slot. Swapping slots can be done via the Azure portal or programmatically using the Azure CLI/SDK. Pulumi defines the existence of the slot; the swap operation is a runtime management action.
## Exercises and Practice Activities

1. **Deploy a Python Flask App:** Modify the basic App Service deployment example to create a Linux App Service Plan and deploy a Python application. Set the `linuxFxVersion` in `siteConfig` to `PYTHON|3.9` (or a preferred version) and ensure `reserved: true` on the App Service Plan. You don't need to deploy actual Python code, just configure the runtime. _Hint:_ Use `kind: "Linux"` for the App Service Plan.
    
2. **Configure Environment Variables for Development and Production:** Imagine you have a `DEV_API_KEY` and a `PROD_API_KEY`. Modify the deployment slots example to include these distinct application settings for the `production` slot and the `staging` slot. Ensure that `DEV_API_KEY` is only present in the staging slot and `PROD_API_KEY` in the production slot.
    
3. **Explore Different App Service SKUs:** Change the `sku` for the App Service Plan in the `appServicePlan` resource to `S1` (Standard tier, size S1). Observe the changes in the `pulumi preview` output. _Note:_ Changing the SKU can incur higher costs. Remember to revert or destroy resources if experimenting with higher tiers.
    
4. **Add a Custom Health Check Path:** For the production App Service, add a `healthCheckPath` property within `siteConfig` and set its value to `/health`. This path is used by Azure to determine the health of your application instances.