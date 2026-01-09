import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { Provider as K8sProvider } from "@pulumi/kubernetes/provider";

export interface AtScaleSecretsConfig {
  k8sProvider: K8sProvider;
  namespace: pulumi.Input<string>;

  postgresHost: pulumi.Input<string>;
  postgresPort?: number;

  atscaleUser: pulumi.Input<string>;
  atscalePassword: pulumi.Input<string>;
  atscaleDbName: pulumi.Input<string>;

  keycloakUser: pulumi.Input<string>;
  keycloakPassword: pulumi.Input<string>;
  keycloakDbName: pulumi.Input<string>;

  pgwireUser: pulumi.Input<string>;
  pgwirePassword: pulumi.Input<string>;
  pgwireDbName: pulumi.Input<string>;

  redisHost: pulumi.Input<string>;
  redisPort?: number;
  redisUser?: pulumi.Input<string>;
  redisPassword: pulumi.Input<string>;
}

export interface AtScaleSecretsResult {
  atscalePostgresSecret: k8s.core.v1.Secret;
  keycloakPostgresSecret: k8s.core.v1.Secret;
  pgwirePostgresSecret: k8s.core.v1.Secret;
  engineRedisSecret: k8s.core.v1.Secret;
}

export function setupAtScaleSecrets(config: AtScaleSecretsConfig): AtScaleSecretsResult {
  const pgPort = config.postgresPort ?? 5432;
  const redisPort = config.redisPort ?? 6380;
  const redisUser = config.redisUser ?? "";

  const atscalePostgresSecret = new k8s.core.v1.Secret(
    "atscale-postgres-external",
    {
      metadata: { name: "atscale-postgres-external", namespace: config.namespace },
      type: "Opaque",
      stringData: {
        host: config.postgresHost,
        port: pgPort.toString(),
        database: config.atscaleDbName,
        user: "sqladmin",
        password: config.atscalePassword,
        sslEnabled: "true",
        sslMode: "require",
      },
    },
    { provider: config.k8sProvider }
  );

  const keycloakPostgresSecret = new k8s.core.v1.Secret(
    "keycloak-postgres-external",
    {
      metadata: { name: "keycloak-postgres-external", namespace: config.namespace },
      type: "Opaque",
      stringData: {
        host: config.postgresHost,
        port: pgPort.toString(),
        database: config.keycloakDbName,
        user: "sqladmin",
        password: config.keycloakPassword,
      },
    },
    { provider: config.k8sProvider }
  );

  const pgwirePostgresSecret = new k8s.core.v1.Secret(
    "pgwire-postgres-external",
    {
      metadata: { name: "pgwire-postgres-external", namespace: config.namespace },
      type: "Opaque",
      stringData: {
        host: config.postgresHost,
        port: pgPort.toString(),
        database: config.pgwireDbName,
        user: "sqladmin",
        password: config.pgwirePassword,
      },
    },
    { provider: config.k8sProvider }
  );

  const engineRedisSecret = new k8s.core.v1.Secret(
    "engine-redis-external",
    {
      metadata: { name: "engine-redis-external", namespace: config.namespace },
      type: "Opaque",
      stringData: {
        host: config.redisHost,
        port: redisPort.toString(),
        user: redisUser,
        password: config.redisPassword,
        sslEnabled: "true",
      },
    },
    { provider: config.k8sProvider }
  );

  return {
    atscalePostgresSecret,
    keycloakPostgresSecret,
    pgwirePostgresSecret,
    engineRedisSecret,
  };
}
