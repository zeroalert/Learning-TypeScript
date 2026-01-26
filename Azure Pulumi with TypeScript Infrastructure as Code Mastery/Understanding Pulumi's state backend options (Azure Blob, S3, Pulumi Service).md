# Understanding Pulumi's state backend options (Azure Blob, S3, Pulumi Service)

Pulumi manages the state of your infrastructure deployments, which is a critical aspect of Infrastructure as Code. This state file is a record of the resources Pulumi has provisioned and their current configuration, acting as the single source of truth for your infrastructure. Pulumi needs access to this state file to understand what changes to apply during updates, to identify resources to destroy, and to manage dependencies between resources. The location and management of this state file are determined by the chosen state backend.

## Understanding Pulumi State Backends

A Pulumi state backend is a storage location where Pulumi saves the current state of your deployed infrastructure. This state includes mappings between your Pulumi program's resources and the real cloud resources, as well as metadata about the deployment. Choosing an appropriate backend is essential for team collaboration, security, and operational reliability.

There are three primary categories of state backends that Pulumi supports:

1. **Pulumi Service Backend:** This is the default and recommended backend provided by Pulumi Cloud. It offers a managed service for state storage, secrets management, and team collaboration features.
2. **Cloud Storage Backends:** These leverage existing cloud object storage services like Azure Blob Storage or Amazon S3 to store the state files. This approach gives you more control over your state data and can integrate well with existing cloud environments.
3. **Local Backend:** For individual experimentation or very small, isolated projects, Pulumi can store the state file directly on your local filesystem. This is generally not recommended for team environments or production use cases due to a lack of collaboration features and susceptibility to data loss.

### Pulumi Service Backend

The Pulumi Service backend is a hosted service provided by Pulumi that handles state storage, secrets encryption, policy enforcement, and offers a web-based console for visualizing your infrastructure. It is the default option when you initialize a new Pulumi project if you are logged into the Pulumi Service.

**Features and Benefits:**

- **Managed State Storage:** Pulumi automatically handles the storage and versioning of your state files.
- **Team Collaboration:** Provides features for managing access control, sharing stacks, and viewing deployment history for teams.
- **Secrets Management:** Integrates with Pulumi's built-in secrets provider for encrypting sensitive configuration values directly within the state.
- **Policy as Code:** Enables the application of governance policies to your infrastructure deployments.
- **Web Console:** Offers a graphical interface to inspect stack outputs, resource details, and deployment logs.
- **Scalability and Reliability:** Designed for high availability and performance across various deployment scales.

**Real-world Example:**

Consider a development team at a company named "GlobalTech" deploying multiple microservices to Azure. Each microservice has its own Pulumi stack for different environments (development, staging, production). Using the Pulumi Service backend allows:

- **Centralized State:** All team members can access the latest state for any stack, ensuring everyone is working with the same infrastructure definition.
- **Access Control:** GlobalTech can set specific permissions for team members, allowing developers to manage development stacks, while only senior engineers can approve production deployments.
- **Audit Trails:** The Pulumi Service console provides a detailed history of all deployments, including who initiated them and what changes were made, which is crucial for compliance and troubleshooting.

**Hypothetical Scenario:**

Imagine a solo developer building a complex personal project involving Azure Functions, Cosmos DB, and Azure API Management. Even for a single user, the Pulumi Service provides valuable features like state versioning, making it easy to roll back to previous states if a deployment goes awry. It also offers a visual overview of all deployed resources without needing to query Azure directly.

**Configuration:**

To use the Pulumi Service backend, you typically just need to log in via the Pulumi CLI:

bash

```
pulumi login
```

If you don't specify another backend, Pulumi will default to storing your state in the Pulumi Service under your account.

### Cloud Storage Backends (Azure Blob, S3)

Cloud storage backends allow you to store your Pulumi state files in your own cloud storage accounts, such as Azure Blob Storage or Amazon S3. This provides greater control over your state data's location, encryption, and access policies, integrating directly with your existing cloud infrastructure.

**Features and Benefits:**

- **Data Ownership and Control:** You own and manage the storage account where the state files reside, giving you full control over data residency and compliance.
- **Integration with Cloud Security:** Leverages existing IAM policies, encryption mechanisms (e.g., Azure Storage Encryption, S3 server-side encryption), and networking controls of your cloud provider.
- **Cost-Effective:** Often utilizes existing cloud resources you already pay for, potentially reducing overall costs compared to a dedicated managed service if you have specific volume requirements or enterprise agreements.
- **Air-gapped Environments:** Suitable for highly regulated environments where external services are not permitted.

#### Azure Blob Storage Backend

For Azure users, storing Pulumi state in an Azure Blob Storage container is a natural fit. This leverages Azure's robust, scalable, and secure object storage service.

**Requirements for Azure Blob Storage Backend:**

- An Azure Storage Account.
- A Blob Container within that storage account.
- Appropriate permissions for the user or service principal running Pulumi to read and write to the container.

**Real-world Example:**

A financial services company, "SecureBank," has strict data sovereignty requirements and a policy against using third-party managed services for core infrastructure state. They use Azure Blob Storage for their Pulumi state.

- **Compliance:** By keeping state files within their own Azure subscription, SecureBank can meet regulatory requirements for data residency and auditing.
- **Enhanced Security:** They can apply Azure policies directly to the storage account, enforce specific encryption keys (e.g., customer-managed keys), and restrict network access to the storage account using Private Endpoints, significantly reducing the attack surface.
- **Integration with Azure AD:** Access to the storage account can be controlled via Azure Active Directory roles, simplifying identity management.

**Configuration for Azure Blob Storage:**

First, ensure you have an Azure Storage Account and a container. Let's assume you've created a storage account named `mystateaccount123` and a container named `pulumi-state`.

You would then set the `PULUMI_BACKEND_URL` environment variable:

bash

```
export PULUMI_BACKEND_URL="azblob://mystateaccount123.blob.core.windows.net/pulumi-state"
```

Alternatively, you can configure it within your `Pulumi.yaml` for the project or specify it during `pulumi login` if supported for cloud storage backends (though environment variable is more common for explicit cloud storage).

When `pulumi up` is run, Pulumi will automatically connect to this Azure Blob Storage container to read and write state. Ensure the identity running Pulumi (e.g., a Service Principal or managed identity) has `Storage Blob Data Contributor` role on the storage account or container.

#### Amazon S3 Backend

Similar to Azure Blob Storage, S3 serves as a highly durable and scalable object storage service for Pulumi state in AWS environments.

**Requirements for S3 Backend:**

- An AWS S3 bucket.
- Appropriate IAM permissions for the user or role running Pulumi to read and write to the bucket.
- Version control enabled on the S3 bucket is highly recommended for state history.

**Real-world Example:**

An e-commerce company, "CloudMart," primarily operates on AWS and has a mature AWS ecosystem. They leverage S3 for their Pulumi state to maintain consistency with their existing AWS operational practices.

- **Existing Tooling Integration:** CloudMart's security and monitoring tools are already configured to work with S3 buckets, making it seamless to extend these to include Pulumi state.
- **S3 Versioning:** By enabling versioning on their S3 state buckets, they get an automatic history of their infrastructure state, which is crucial for disaster recovery and auditing.
- **Cost Optimization:** Since they already have a significant investment in S3 for other data, the incremental cost of storing Pulumi state is minimal.

**Configuration for S3:**

First, create an S3 bucket, for example, `my-pulumi-state-bucket-123`. It is highly recommended to enable versioning on this bucket.

You would set the `PULUMI_BACKEND_URL` environment variable:

bash

```
export PULUMI_BACKEND_URL="s3://my-pulumi-state-bucket-123"
```

Pulumi will then use this S3 bucket for state storage. The IAM identity running Pulumi needs permissions like `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, and `s3:ListBucket` on the specified bucket.

### Local Backend

The local backend stores the Pulumi state file directly on the filesystem where `pulumi` commands are executed. This is the default when no `PULUMI_BACKEND_URL` is set and you are not logged into the Pulumi Service.

**Features and Limitations:**

- **Simplicity:** Easiest to get started with for personal experimentation.
- **No Collaboration:** Does not support multiple users or machines working on the same stack concurrently.
- **Risk of Data Loss:** The state file is stored locally, making it susceptible to accidental deletion, disk failure, or loss if the machine is compromised.
- **No Remote Operations:** `pulumi up` can only be run from the machine where the state file is located.
- **No Built-in Secrets Management:** Local state files do not inherently encrypt secrets in the same way as the Pulumi Service. While Pulumi's local secrets provider encrypts secrets, the master key is also local, which can be less secure for shared environments.

**Real-world Example (Anti-pattern):**

A small startup's lead developer initially uses the local backend for all Pulumi projects because it's the simplest way to get started. As the team grows and more developers need to contribute to infrastructure, they quickly run into problems:

- Developer A deploys changes and updates their local state file.
- Developer B tries to deploy changes but has an outdated local state file, leading to conflicts or unexpected resource changes.
- If Developer A's laptop crashes, their local state file is lost, requiring a manual recovery process or even a full re-import of infrastructure from the cloud, which is time-consuming and error-prone.

This scenario highlights why the local backend is unsuitable for teams or any critical infrastructure.

**Configuration for Local Backend:**

You typically don't configure anything explicitly. If you are not logged into the Pulumi Service and have not set `PULUMI_BACKEND_URL`, Pulumi will default to storing state in a `.`pulumi` directory within your project.

bash

```
# No explicit configuration needed for local backend# Pulumi will create a .pulumi/ folder in your project directory# containing the stack's state file (e.g., .pulumi/stacks/dev.json)
```

## Choosing the Right Backend

The choice of state backend depends heavily on your team size, security requirements, compliance needs, and existing cloud infrastructure.

|Feature / Backend|Pulumi Service|Azure Blob Storage|Amazon S3|Local Filesystem|
|---|---|---|---|---|
|**Collaboration**|Excellent (built-in teams, RBAC)|Good (requires shared storage/access)|Good (requires shared storage/access)|None (single user)|
|**Secrets Management**|Built-in (encrypted)|Requires Pulumi's local secrets provider + master key storage|Requires Pulumi's local secrets provider + master key storage|Requires Pulumi's local secrets provider + master key storage|
|**Security**|Pulumi-managed, enterprise-grade|Leverages Azure security (IAM, encryption, network controls)|Leverages AWS security (IAM, encryption, network controls)|Limited (depends on local machine security)|
|**Compliance/Auditing**|Built-in logs, console history|Azure logs, access to raw state file|AWS logs, access to raw state file|Manual (no built-in logging)|
|**Reliability**|High (managed service)|High (Azure Storage durability)|High (S3 durability)|Low (single point of failure)|
|**Ease of Setup**|Very easy (pulumi login)|Moderate (setup storage account, container, permissions)|Moderate (setup bucket, permissions)|Very easy (default)|
|**Cost**|Tiered pricing based on usage|Standard Azure Storage costs|Standard S3 costs|Free|
|**Primary Use Case**|Teams, production, enterprise|Azure-centric teams, compliance|AWS-centric teams, compliance|Individual dev, experimentation|

**Connecting to Previous Lessons:**

In Module 1, we touched upon managing Pulumi state and understanding its importance. Now, we are diving deeper into _how_ that state is managed through different backend options. The basic `pulumi up` and `pulumi destroy` commands you've used implicitly relied on a state backend (either local or Pulumi Service by default). This lesson clarifies where that state lives and why the choice matters for larger, more complex projects that leverage Azure resources (as covered in Module 2) and advanced networking/security (Module 3). Understanding state backends is foundational before we delve into secrets and configuration management in upcoming lessons, as the backend choice impacts how secrets are stored and accessed.

## Exercises and Practice Activities

### Exercise 1: Migrating from Local to Azure Blob Storage Backend

**Scenario:** You've been developing a Pulumi project locally, deploying an Azure Resource Group and Storage Account (similar to what we did in Module 2). Now, your team needs to centralize the state in Azure Blob Storage.

**Steps:**

1. **Initialize a new Pulumi project locally (if you don't have one):**
    
    bash
    
    ```
    mkdir my-azure-appcd my-azure-apppulumi new azure-typescript
    ```
    
    Accept the defaults. Modify `index.ts` to create a simple Azure Resource Group and Storage Account, similar to Module 2 lessons.
    
    typescript
    
    ```
    import * as pulumi from "@pulumi/pulumi";import * as azure from "@pulumi/azure-native";const resourceGroup = new azure.resources.ResourceGroup("my-rg", {    location: "East US",});const storageAccount = new azure.storage.StorageAccount("mysa", {    resourceGroupName: resourceGroup.name,    location: resourceGroup.location,    sku: {        name: "Standard_LRS",    },    kind: "StorageV2",});export const resourceGroupName = resourceGroup.name;export const storageAccountName = storageAccount.name;
    ```
    
2. **Deploy the stack using the local backend:**
    
    bash
    
    ```
    pulumi up
    ```
    
    Verify that a `.pulumi/stacks/dev.json` file is created in your project directory.
3. **Create an Azure Storage Account and Container for state:** Use the Azure portal or Azure CLI to create a new storage account (e.g., `pulomistateacct12345`) and within it, a blob container (e.g., `pulumi-states`).
    
    bash
    
    ```
    # Replace <YOUR_RESOURCE_GROUP> and <YOUR_STORAGE_ACCOUNT_NAME> with unique namesaz group create --name PulumiStateRG --location eastusaz storage account create --name pulomistateacct12345 --resource-group PulumiStateRG --location eastus --sku Standard_LRS --kind StorageV2az storage container create --name pulumi-states --account-name pulomistateacct12345
    ```
    
4. **Configure Pulumi to use the Azure Blob Storage backend:** Set the `PULUMI_BACKEND_URL` environment variable.
    
    bash
    
    ```
    export PULUMI_BACKEND_URL="azblob://pulomistateacct12345.blob.core.windows.net/pulumi-states"
    ```
    
    Ensure your Azure CLI is logged in and has appropriate permissions to the storage account (e.g., `Storage Blob Data Contributor`).
5. **Migrate the local state to the new backend:** Pulumi provides a command for this:
    
    bash
    
    ```
    pulumi state mv --to-url <new_backend_url> --stack dev --from-url file://.
    ```
    
    In our case, since we've already set `PULUMI_BACKEND_URL`, you can simplify:
    
    bash
    
    ```
    pulumi state mv --stack dev
    ```
    
    Pulumi will detect the `PULUMI_BACKEND_URL` and move the state.
6. **Verify the state migration:**
    - Check the Azure Blob Storage container. You should see a new blob named `dev.json` (or similar, depending on stack name) appear.
    - Run `pulumi stack ls`. You should still see your `dev` stack listed.
    - Run `pulumi stack select dev` followed by `pulumi stack export`. The output should reflect the state from the blob storage.
    - Optionally, delete the local `.pulumi` directory to confirm Pulumi is no longer using it.
7. **Perform an update with the new backend:** Make a minor change to `index.ts`, for example, add a tag to the resource group.
    
    typescript
    
    ```
    const resourceGroup = new azure.resources.ResourceGroup("my-rg", {    location: "East US",    tags: {        "environment": "dev", // Added tag    },});
    ```
    
    Run `pulumi up`. Pulumi should detect the change and update the resource group using the state from Azure Blob Storage.

### Exercise 2: Understanding State Inconsistency

**Scenario:** Illustrate the problem of state inconsistency that arises from using the local backend in a multi-user context.

**Steps:**

1. **User A (Your current machine):**
    
    - Ensure your `PULUMI_BACKEND_URL` is _unset_ or explicitly set to a local path (`file://.`).
    - Create a new Pulumi project and deploy a simple Azure Resource Group.
    
    bash
    
    ```
    mkdir user-a-project && cd user-a-projectpulumi new azure-typescript --dir . -y -f# index.ts:import * as pulumi from "@pulumi/pulumi";import * as azure from "@pulumi/azure-native";const resourceGroup = new azure.resources.ResourceGroup("shared-rg", {    location: "West US",});export const resourceGroupName = resourceGroup.name;
    ```
    
    - Run `pulumi up`.
    - Observe the `shared-rg` resource group created in Azure and the `dev.json` state file locally.
2. **User B (Simulated on a different directory, representing another machine):**
    
    - Create a _copy_ of User A's project directory (excluding the `.pulumi` directory) into a new location.
    
    bash
    
    ```
    cp -r user-a-project ../user-b-projectcd ../user-b-project# Delete local state if copiedrm -rf .pulumi
    ```
    
    - **Important:** User B _does not_ have the state file, but they assume the resource group exists. They want to add a tag to this existing resource group.
    - Modify `index.ts` to add a tag.
    
    typescript
    
    ```
    import * as pulumi from "@pulumi/pulumi";import * as azure from "@pulumi/azure-native";const resourceGroup = new azure.resources.ResourceGroup("shared-rg", {    location: "West US",    tags: {        "owner": "user-b", // User B adds a tag    },});export const resourceGroupName = resourceGroup.name;
    ```
    
    - Run `pulumi up`.
    - **Observe the outcome:** Pulumi will attempt to _create a new resource group_ named `shared-rg` because it has no local state to tell it that a resource with that logical name already exists in Azure. This will likely fail with a "resource already exists" error or create a different resource if the name is not globally unique. This demonstrates the problem of state inconsistency.
3. **Resolution (using a shared backend):**
    - Now, clean up the `shared-rg` resource group created by User A.
    - Repeat Step 1 (User A) but this time, configure `PULUMI_BACKEND_URL` to point to the Azure Blob Storage backend you set up in Exercise 1.
    - Run `pulumi up`. The state is now in Azure Blob Storage.
    - For User B (in `../user-b-project`), configure the _same_ `PULUMI_BACKEND_URL` and run `pulumi up`.
    - **Observe the outcome:** Pulumi (for User B) will now find the existing state in the Azure Blob Storage, recognize the `shared-rg` resource group, and proceed to update it by adding the `owner` tag without attempting to create a new resource group.