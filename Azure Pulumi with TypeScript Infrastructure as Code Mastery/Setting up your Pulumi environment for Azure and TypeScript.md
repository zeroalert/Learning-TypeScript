## Installing the Pulumi CLI
The Pulumi Command Line Interface (CLI) is the primary tool for interacting with Pulumi. It allows you to create new projects, deploy infrastructure, manage stacks, and inspect the state of your deployments.

## Installing Node.js and npm
Pulumi projects written in TypeScript require Node.js and its package manager, npm (or Yarn, pnpm), to compile the TypeScript code and manage project dependencies. TypeScript is a superset of JavaScript, and Node.js provides the runtime environment for JavaScript outside of a web browser.

### Node.js and npm Installation

The recommended way to install Node.js and npm is to use a version manager like `nvm` (Node Version Manager) for Linux/macOS or `nvm-windows` for Windows. Version managers allow you to easily switch between different Node.js versions, which is useful when working on multiple projects with varying requirements.

**macOS/Linux (using nvm):**

1. **Install nvm:**
    
    bash
    
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ```
    
    Close and reopen your terminal after installation for `nvm` to be available.
    
2. **Install Node.js (LTS version recommended):**
    
    bash
    
    ```
    nvm install --ltsnvm use --lts
    ```
    
3. **Verify Node.js and npm:**
    
    bash
    
    ```
    node -vnpm -v
    ```
    

**Windows (using nvm-windows):**

1. **Download nvm-windows:** Go to the `nvm-windows` GitHub repository releases page ([https://github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)) and download the `nvm-setup.zip` file.
    
2. **Run the installer:** Extract the `zip` file and run the `nvm-setup.exe` installer. Follow the prompts.
    
3. **Install Node.js (LTS version recommended):** Open a new Command Prompt or PowerShell as administrator.
    
    powershell
    
    ```
    nvm install ltsnvm use lts
    ```
    
4. **Verify Node.js and npm:**
    
    powershell
    
    ```
    node -vnpm -v
    ```

### Importance of Node.js for TypeScript Pulumi Projects

- When you write Pulumi infrastructure code in Typescript, Node.js acts as the runtime environment for executing that code. Before execution, the Typescript code is compiled into Javascript. npm is used to install Pulumi's Azure SDK (e.g., `@pulumi/azure-native)` or `@pulumi/azure)` and any other dependencies your project might need.  
``` Typescript
import * as azure from "@pulumi/azure"; // Imports the Pulumi Azure Classic provider

const resourceGroup = new azure.core.ResourceGroup("my-resourcegroup", {
    location: "West US",
});
```
- pulumi login
- This command will open your web browser and direct you to the Pulumi Service login page. You can log in using your GitHub, GitLab, Atlassian, Microsoft, or email account.
- After logging in, the CLI stores a local token in your user profile (`~/.pulumi` on Linux/macOS, `AppData\Roaming\Pulumi` on Windows) to maintain your session.

### Understanding Pulumi Service as a Backend

The Pulumi Service provides a hosted backend that offers several benefits:

- **State Management:** Securely stores your Pulumi state files in the cloud.
- **Team Collaboration:** Facilitates sharing state files and project stacks across teams.
- **Audit Trails:** Provides a history of deployments and changes to your infrastructure.
- **Policy as Code:** Enables advanced governance features.