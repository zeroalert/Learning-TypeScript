 # Azure Native TypeScript Pulumi Template

 This template provides a minimal, ready-to-go Pulumi program for deploying Azure resources using the Azure Native provider in TypeScript. It establishes a basic infrastructure stack that you can use as a foundation for more complex deployments.

 ## When to Use This Template

 - You need a quick boilerplate for Azure Native deployments with Pulumi and TypeScript
 - You want to create a Resource Group and Storage Account as a starting point
 - You’re exploring Pulumi’s Azure Native SDK and TypeScript support

 ## Prerequisites

 - An active Azure subscription
 - Node.js (LTS) installed
 - A Pulumi account and CLI already installed and configured
 - Azure credentials available (e.g., via `az login` or environment variables)

 ## Usage

 Scaffold a new project from the Pulumi registry template:
 ```bash
 pulumi new azure-typescript
 ```

 Follow the prompts to:
 1. Name your project and stack
 2. (Optionally) override the default Azure location

 Once the project is created:
 ```bash
 cd <your-project-name>
 pulumi config set azure-native:location <your-region>
 pulumi up
 ```

 ## Project Layout

 ```
 .
 ├── Pulumi.yaml       # Project metadata & template configuration
 ├── index.ts          # Main Pulumi program defining resources
 ├── package.json      # Node.js dependencies and project metadata
 └── tsconfig.json     # TypeScript compiler options
 ```

 ## Configuration

 Pulumi configuration lets you customize deployment parameters.

 - **azure-native:location** (string)
   - Description: Azure region to provision resources in
   - Default: `WestUS2`

 Set a custom location before deployment:
 ```bash
 pulumi config set azure-native:location eastus
 ```

 ## Resources Created

 1. **Resource Group**: A container for all other resources
 2. **Storage Account**: A StorageV2 account with Standard_LRS SKU

 ## Outputs

 After `pulumi up`, the following output is exported:
 - **storageAccountName**: The name of the created Storage Account

 Retrieve it with:
 ```bash
 pulumi stack output storageAccountName
 ```

 ## Next Steps

 - Extend this template by adding more Azure Native resources (e.g., Networking, App Services)
 - Modularize your stack with Pulumi Components for reusable architectures
 - Integrate with CI/CD pipelines (GitHub Actions, Azure DevOps, etc.)

 ## Getting Help

 If you have questions or run into issues:
 - Explore the Pulumi docs: https://www.pulumi.com/docs/
 - Join the Pulumi Community on Slack: https://pulumi-community.slack.com/
 - File an issue on the Pulumi Azure Native SDK GitHub: https://github.com/pulumi/pulumi-azure-native/issues


S C:\Users\madam\Infra-AtScale> ^C
PS C:\Users\madam\Infra-AtScale> kubectl get pods -n atscale -w
NAME                                      READY   STATUS             RESTARTS        AGE
atscale-db-0                              2/2     Running            0               22m
atscale-engine-5666fb64b7-5kcpn           1/2     Init:1/2           0               10s
atscale-engine-6bb5746b99-x227l           1/2     Init:1/2           0               10s
atscale-engine-gateway-cdd9c6ccc-j2sb4    2/2     Running            0               9m21s
atscale-entitlement-5c4bb9c86d-jhr5q      1/1     Running            0               9m20s
atscale-ingress-gateway-98bfb7859-jvpnr   2/2     Running            0               22m
atscale-keycloak-0                        2/2     Running            0               22m
atscale-sml-api-6d4c46ddf7-psskn          0/1     Running            0               9m21s
atscale-sml-api-784d87ff7c-tkcx7          0/1     Running            0               10m
atscale-sml-web-54ffcbf4cd-v2tds          2/2     Running            0               9m20s
atscale-telemetry-66655466b9-7m4xg        1/1     Running            0               22m
nettest                                   0/1     CrashLoopBackOff   7 (3m21s ago)   14m
redis-test2                               0/1     Error              0               63m
nettest                                   1/1     Running            8 (5m4s ago)    16m
nettest                                   0/1     Completed          8 (5m5s ago)    16m
nettest                                   0/1     CrashLoopBackOff   8 (12s ago)     16m
PS C:\Users\madam\Infra-AtScale> kubectl logs atscale-engine-5666fb64b7-5kcpn -n atscale -c engine-init --tail=50 | Select-String -Pattern "Redis|connectivity|SUCCESS"

2026-01-10 05:55:25,981 INFO  [main] {} com.atscale.engine                       - Checking connectivity to: List(AppDb postgres, Redis, Entitlement)
2026-01-10 05:55:26,619 INFO  [http-system-pekko.actor.default-dispatcher-8] {} com.atscale.engine.utils.actor.typed.ServerStatus - Successfully started HTTP
2026-01-10 05:55:26,657 INFO  [main] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:55:43,959 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to: 
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server: 
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:55:45,031 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:56:01,958 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to: 
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server: 
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:03,015 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:56:19,972 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to: 
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server: 
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:21,125 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:56:38,046 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to: 
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server: 
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:39,120 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:56:56,132 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to: 
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:57,199 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:57:14,159 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:57:15,317 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:57:32,241 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:57:33,249 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0


PS C:\Users\madam\Infra-AtScale> kubectl logs atscale-engine-5666fb64b7-5kcpn -n atscale -c engine-init | Select-String -Pattern "Redis|connectivity|Connected" | Select-Object -Last 10

2026-01-10 05:56:19,972 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:21,125 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:56:38,046 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:39,120 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:56:56,132 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:56:57,199 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:57:14,159 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:57:15,317 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0
2026-01-10 05:57:32,241 INFO  [scala-execution-context-global-45] {} com.atscale.engine.starter.services.ConnectivityChecker - Failed connectivity check to:       
Redis. Reason: java.util.concurrent.ExecutionException: org.redisson.client.RedisConnectionException: Unable to connect to Redis server:
atscale-redis-dev2a476a53.eastus2.redisenterprise.cache.azure.net/10.69.112.89:10000
2026-01-10 05:57:33,249 INFO  [scala-execution-context-global-45] {} org.redisson.Version                     - Redisson 3.51.0


PS C:\Users\madam\Infra-AtScale> az redisenterprise database show --cluster-name atscale-redis-dev2a476a53 --resource-group vzn-eastus2-atscale_dev-rg-01 --query "{clientProtocol:clientProtocol, port:port, tlsVersion:clusteringPolicy}" -o table
ClientProtocol    Port    TlsVersion
----------------  ------  -----------------
Encrypted         10000   EnterpriseCluster
PS C:\Users\madam\Infra-AtScale> kubectl patch secret engine-redis-external -n atscale --type=json -p='[{"op": "replace", "path": "/data/sslEnabled", "value": "dHJ1ZQ=="}]'
secret/engine-redis-external patched
PS C:\Users\madam\Infra-AtScale> kubectl set env deployment/atscale-engine -n atscale ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE-
deployment.apps/atscale-engine env updated
PS C:\Users\madam\Infra-AtScale> kubectl delete pod -n atscale atscale-engine-5666fb64b7-5kcpn atscale-engine-6bb5746b99-x227l
pod "atscale-engine-5666fb64b7-5kcpn" deleted
pod "atscale-engine-6bb5746b99-x227l" deleted
PS C:\Users\madam\Infra-AtScale> Start-Sleep -Seconds 30; kubectl get pods -n atscale | Select-String "engine"

atscale-engine-5666fb64b7-dzw5l           1/2     Init:1/2           0               39s
atscale-engine-6bb5746b99-8rhdf           1/2     Init:1/2           0               39s
atscale-engine-gateway-cdd9c6ccc-j2sb4    2/2     Running            0               13m


PS C:\Users\madam\Infra-AtScale> kubectl logs atscale-engine-5666fb64b7-dzw5l -n atscale -c engine-init --tail=70 | Select-String -Pattern "Redis|Entitlement|Finished|SUCCESS" | Select-Object -Last 15

        at io.netty.util.concurrent.DefaultPromise.setSuccess0(DefaultPromise.java:639)
        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)
2026-01-10 05:59:43,949 WARN  [redisson-netty-23-4] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x3411bea8]        
        at org.redisson.client.handler.RedisChannelInitializer.initSsl(RedisChannelInitializer.java:140)
        at org.redisson.client.handler.RedisChannelInitializer.initChannel(RedisChannelInitializer.java:78)
        at io.netty.util.concurrent.DefaultPromise.setSuccess0(DefaultPromise.java:639)
        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)


PS C:\Users\madam\Infra-AtScale> kubectl exec -it atscale-engine-5666fb64b7-dzw5l -n atscale -c engine-init -- env | Select-String "TRUSTSTORE"

ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE=


PS C:\Users\madam\Infra-AtScale> kubectl set env deployment/atscale-engine -n atscale ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE=/opt/java/openjdk/lib/security/cacerts
deployment.apps/atscale-engine env updated
PS C:\Users\madam\Infra-AtScale> kubectl set env deployment/atscale-engine -n atscale ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE_PASSWORD=changeit
deployment.apps/atscale-engine env updated
PS C:\Users\madam\Infra-AtScale> kubectl get pods -n atscale | Select-String "atscale-engine-" | Select-Object -First 2

atscale-engine-58c5f444f7-6hfj4           1/2     Init:1/2           0               11s
atscale-engine-5cfd684c4d-tpqj7           1/2     Init:1/2           0               6s


PS C:\Users\madam\Infra-AtScale> Start-Sleep -Seconds 25; kubectl logs atscale-engine-58c5f444f7-6hfj4 -n atscale -c engine-init --tail=80 | Select-String -Pattern
 "Redis|Finished|SUCCESS|connectivity" | Select-Object -Last 10

        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)
2026-01-10 06:01:14,375 WARN  [redisson-netty-20-14] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0xb84c0f2e]       
        at org.redisson.client.handler.RedisChannelInitializer.initSsl(RedisChannelInitializer.java:140)
        at org.redisson.client.handler.RedisChannelInitializer.initChannel(RedisChannelInitializer.java:78)
        at io.netty.util.concurrent.DefaultPromise.setSuccess0(DefaultPromise.java:639)
        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)


PS C:\Users\madam\Infra-AtScale> kubectl logs atscale-engine-58c5f444f7-6hfj4 -n atscale -c engine-init | Select-String -Pattern "EOFException|FileNotFoundException|IOException|java.io" -Context 2,0 | Select-Object -First 5

  2026-01-10 06:00:36,985 INFO  [main] {} org.redisson.Version                     - Redisson 3.51.0
  2026-01-10 06:00:37,334 WARN  [redisson-netty-1-3] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x641a6b96]       
> java.io.EOFException: null
        at java.base/java.lang.Thread.run(Thread.java:1583)
  2026-01-10 06:00:37,334 WARN  [redisson-netty-1-4] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x4dfb13c7]       
> java.io.EOFException: null
        at java.base/java.lang.Thread.run(Thread.java:1583)
  2026-01-10 06:00:38,841 WARN  [redisson-netty-1-8] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x03f1a0ea]       
> java.io.EOFException: null
        at java.base/java.lang.Thread.run(Thread.java:1583)
  2026-01-10 06:00:38,841 WARN  [redisson-netty-1-9] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0xbe9ed98a]       
> java.io.EOFException: null
        at java.base/java.lang.Thread.run(Thread.java:1583)
  2026-01-10 06:00:40,371 WARN  [redisson-netty-1-13] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0xdb3a2db0]      
> java.io.EOFException: null


PS C:\Users\madam\Infra-AtScale> kubectl exec -it atscale-engine-58c5f444f7-6hfj4 -n atscale -c engine-init -- sh -c "ls -la /opt/java/openjdk/lib/security/cacerts 2>&1 || ls -la /usr/lib/jvm/*/lib/security/cacerts 2>&1 || echo 'Cacerts not found'"
ls: cannot access '/opt/java/openjdk/lib/security/cacerts': Unknown system error
-rw-r--r-- 1 root root 196735 Jul  9  2025 /usr/lib/jvm/default-jvm/lib/security/cacerts
-rw-r--r-- 1 root root 196735 Jul  9  2025 /usr/lib/jvm/java-21-amazon-corretto/lib/security/cacerts
PS C:\Users\madam\Infra-AtScale> kubectl set env deployment/atscale-engine -n atscale ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE=/usr/lib/jvm/java-21-amazon-corretto/lib/security/cacerts
deployment.apps/atscale-engine env updated
PS C:\Users\madam\Infra-AtScale> kubectl get pods -n atscale | Select-String "atscale-engine-" | ForEach-Object { $_.Line.Split()[0] } | ForEach-Object { kubectl delete pod $_ -n atscale }
pod "atscale-engine-5cfd684c4d-tpqj7" deleted
pod "atscale-engine-75d6c56569-wzls6" deleted
pod "atscale-engine-gateway-cdd9c6ccc-j2sb4" deleted
PS C:\Users\madam\Infra-AtScale> Start-Sleep -Seconds 40; kubectl get pods -n atscale | Select-String "engine"

atscale-engine-5cfd684c4d-5sm5j           1/2     Init:1/2           0             82s
atscale-engine-75d6c56569-55j7x           1/2     Init:1/2           0             80s
atscale-engine-gateway-cdd9c6ccc-6l47z    2/2     Running            0             78s


PS C:\Users\madam\Infra-AtScale> kubectl logs atscale-engine-75d6c56569-55j7x -n atscale -c engine-init --tail=100 | Select-String -Pattern "Redis|SUCCESS|Finished|connectivity|Connected" | Select-Object -Last 15

2026-01-10 06:03:47,843 WARN  [redisson-netty-44-13] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x4070c2d2]       
        at org.redisson.client.handler.RedisChannelInitializer.initSsl(RedisChannelInitializer.java:140)
        at org.redisson.client.handler.RedisChannelInitializer.initChannel(RedisChannelInitializer.java:78)
        at io.netty.util.concurrent.DefaultPromise.setSuccess0(DefaultPromise.java:639)
        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)
2026-01-10 06:03:47,844 WARN  [redisson-netty-44-14] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x24671142]       
        at org.redisson.client.handler.RedisChannelInitializer.initSsl(RedisChannelInitializer.java:140)
        at org.redisson.client.handler.RedisChannelInitializer.initChannel(RedisChannelInitializer.java:78)
        at io.netty.util.concurrent.DefaultPromise.setSuccess0(DefaultPromise.java:639)
        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)


PS C:\Users\madam\Infra-AtScale> kubectl logs atscale-engine-75d6c56569-55j7x -n atscale -c engine-init | Select-String -Pattern "EOFException|Exception:" -Context
 0,2 | Select-Object -First 3

> java.io.EOFException: null
        at java.base/sun.security.util.IOUtils.readExactlyNBytes(IOUtils.java:61)
        at java.base/sun.security.util.DerValue.<init>(DerValue.java:471)
> java.io.EOFException: null
        at java.base/sun.security.util.IOUtils.readExactlyNBytes(IOUtils.java:61)
        at java.base/sun.security.util.DerValue.<init>(DerValue.java:471)
> java.io.EOFException: null
        at java.base/sun.security.util.IOUtils.readExactlyNBytes(IOUtils.java:61)
        at java.base/sun.security.util.DerValue.<init>(DerValue.java:471)


PS C:\Users\madam\Infra-AtScale> kubectl exec -it atscale-engine-75d6c56569-55j7x -n atscale -c engine-init -- sh -c "file /usr/lib/jvm/java-21-amazon-corretto/lib/security/cacerts ; env | grep -i redis | grep -i trust"
sh: file: not found
ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE=/usr/lib/jvm/java-21-amazon-corretto/lib/security/cacerts
ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE_PASSWORD=changeit
PS C:\Users\madam\Infra-AtScale> kubectl set env deployment/atscale-engine -n atscale ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE- ATSCALE_ENGINE_REDIS_SSL_TRUSTSTORE_PASSWORD-
deployment.apps/atscale-engine env updated
PS C:\Users\madam\Infra-AtScale> kubectl delete pod -n atscale atscale-engine-5cfd684c4d-5sm5j atscale-engine-75d6c56569-55j7x
pod "atscale-engine-75d6c56569-55j7x" deleted
Error from server (NotFound): pods "atscale-engine-5cfd684c4d-5sm5j" not found
PS C:\Users\madam\Infra-AtScale> kubectl get pods -n atscale | Select-String "atscale-engine-" | Select-Object -First 2

atscale-engine-6bb5746b99-9qqbd           1/2     Init:1/2           0               12s
atscale-engine-75d6c56569-kqr5l           1/2     Init:1/2           0               6s


PS C:\Users\madam\Infra-AtScale> Start-Sleep -Seconds 35; kubectl logs atscale-engine-6bb5746b99-9qqbd -n atscale -c engine-init --tail=100 | Select-String -Pattern "Redis|SUCCESS|Finished|connectivity" | Select-Object -Last 10

        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)
2026-01-10 06:05:10,909 WARN  [redisson-netty-29-4] {} io.netty.channel.ChannelInitializer      - Failed to initialize a channel. Closing: [id: 0x07c375b8]        
        at org.redisson.client.handler.RedisChannelInitializer.initSsl(RedisChannelInitializer.java:140)
        at org.redisson.client.handler.RedisChannelInitializer.initChannel(RedisChannelInitializer.java:78)
        at io.netty.util.concurrent.DefaultPromise.setSuccess0(DefaultPromise.java:639)
        at io.netty.util.concurrent.DefaultPromise.setSuccess(DefaultPromise.java:111)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:78)
        at io.netty.channel.DefaultChannelPromise.setSuccess(DefaultChannelPromise.java:73)
