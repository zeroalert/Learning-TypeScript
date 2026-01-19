Azure Storage Accounts are foundational services in Azure, providing scalable and secure storage for various data types, including blobs, files, queues, and tables. Pulumi allows you to define and deploy these storage accounts using TypeScript, providing a robust, version-controlled, and repeatable approach to infrastructure provisioning. This lesson focuses on the core aspects of deploying Azure Storage Accounts, including their essential properties and configuration options using Pulumi and TypeScript.

## Understanding Azure Storage Accounts.
An Azure Storage Account acts as a top-level container for all your Azure Storage data objects. It provides a unique namespace for your data that is accessible from anywhere in the world over HTTP or HTTPS. All data in a storage account is encrypted at rest by default. Storage accounts offer different performance tiers, access tiers, and redundancy options to meet various workload requirements.

### Storage Account Types.
Azure offers several types of storage accounts, each optimized for specific scenarios:

- **General-purpose v2 (GPv2) storage accounts:** These are the recommended storage account types for most scenarios. They support all storage services (blobs, files, queues, tables, disks) and offer the latest features, including lifecycle management, tiered storage, and object replication. GPv2 accounts provide lower per-gigabyte pricing compared to GPv1 and offer higher scalability.
- **Block Blob storage accounts:** Optimized for block blob workloads that require high transaction rates or use solid-state drives (SSDs) for lower latency. These accounts support only block blobs and do not support page blobs, append blobs, files, tables, or queues. They are ideal for high-performance computing (HPC), machine learning, and content delivery scenarios.
- **File Storage accounts:** Specialized for premium file shares. They are designed for enterprise-grade file share scenarios requiring high performance, such as database workloads, persistent volumes for containers, and media editing.
- **Blob Storage accounts (Legacy):** These are older, specialized accounts for block blobs and append blobs. They do not support page blobs, files, queues, or tables. GPv2 accounts are generally preferred over Blob Storage accounts due to their broader feature set and cost efficiency.

For most deployments, General-purpose v2 is the most flexible and cost-effective choice.

### Real-world Examples of Storage Account Usage

1. **Web Application Backend:** A company developing a SaaS platform uses Azure Storage Accounts to store static website content (HTML, CSS, JavaScript, images) in Blob Storage, user-uploaded profile pictures, and application logs. They might use a GPv2 account with the Hot access tier for frequently accessed content and a Cool tier for older, less frequently accessed logs.
2. **Data Archiving and Backup:** A financial institution uses Azure Storage Accounts for long-term archival of regulatory compliance data and database backups. They leverage GPv2 accounts with the Archive access tier for cost-effective storage of data that needs to be retained for many years but is rarely accessed. Geo-redundant storage (GRS) ensures data durability across regions.
3. **File Sharing for Virtual Machines:** An engineering firm relies on Azure File Shares to provide shared storage for their CAD workstations running as Azure Virtual Machines. They deploy a File Storage account (Premium tier) to ensure high throughput and low latency for large project files accessed concurrently by multiple engineers.
### Basic Storage Account Deployment

Let's deploy a General-purpose v2 storage account with standard LRS redundancy.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// Retrieve the resource group name from Pulumi configuration or a predefined value
// Assuming 'resourceGroupName' is configured in Pulumi.<stack-name>.yaml
const config = new pulumi.Config();
const resourceGroupName = config.require("resourceGroupName"); 

// Example: Define a name for the storage account.
// Storage account names must be globally unique, lowercase, and between 3-24 characters.
const storageAccountName = `mystorageaccount${pulumi.getStack()}`; // Appending stack name for uniqueness

const storageAccount = new azure_native.storage.StorageAccount("myStorageAccount", {
    // The name of the storage account (must be globally unique)
    accountName: storageAccountName,
    // The resource group in which to create the storage account
    resourceGroupName: resourceGroupName,
    // The Azure region for the storage account
    location: "East US", // Replace with your desired region

    // Defines the type of storage account. StorageV2 is General-purpose v2.
    kind: "StorageV2",

    // Defines the SKU (performance tier and replication strategy).
    // Standard_LRS means Standard performance with Locally-Redundant Storage.
    sku: {
        name: "Standard_LRS", 
    },

    // Defines the default access tier for blobs within this account.
    // Hot tier is suitable for frequently accessed data.
    accessTier: "Hot", 
});

// Export the primary endpoint of the storage account for easy access
export const primaryBlobEndpoint = storageAccount.primaryEndpoints.blob;
export const primaryFileEndpoint = storageAccount.primaryEndpoints.file;
export const primaryQueueEndpoint = storageAccount.primaryEndpoints.queue;
export const primaryTableEndpoint = storageAccount.primaryEndpoints.table;
```

### Deploying a Premium Block Blob Storage Account

For high-performance workloads, you might need a Premium Block Blob storage account.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();
const resourceGroupName = config.require("resourceGroupName");

const premiumStorageAccountName = `mypremiumstorage${pulumi.getStack()}`;

const premiumStorageAccount = new azure_native.storage.StorageAccount("myPremiumStorageAccount", {
    accountName: premiumStorageAccountName,
    resourceGroupName: resourceGroupName,
    location: "East US", 
    
    // For premium block blob storage, the kind must be "BlockBlobStorage"
    kind: "BlockBlobStorage", 

    // The SKU name for Premium Block Blob storage starts with "Premium".
    // Premium_LRS for Premium performance with Locally-Redundant Storage.
    sku: {
        name: "Premium_LRS", 
    },

    // Access tier is not applicable for BlockBlobStorage accounts as they are always considered "Hot".
    // accessTier: "Hot", // This line would cause an error or be ignored.
});

export const premiumBlobEndpoint = premiumStorageAccount.primaryEndpoints.blob;
```

### Configuring Geo-Redundant Storage (GRS)

For enhanced data durability and disaster recovery, you can opt for geo-redundant storage.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

const config = new pulumi.Config();
const resourceGroupName = config.require("resourceGroupName");

const grsStorageAccountName = `mygrsstorage${pulumi.getStack()}`;

const grsStorageAccount = new azure_native.storage.StorageAccount("myGRSStorageAccount", {
    accountName: grsStorageAccountName,
    resourceGroupName: resourceGroupName,
    location: "East US", 
    kind: "StorageV2",
    sku: {
        // Standard_GRS for Geo-Redundant Storage
        name: "Standard_GRS", 
    },
    accessTier: "Hot",
});

export const grsBlobEndpoint = grsStorageAccount.primaryEndpoints.blob;
```

