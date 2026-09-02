export const config = {
  region: process.env.AWS_REGION ?? "ap-south-1",
  port: Number(process.env.PORT ?? 3333),
  mysql: {
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? "daya",
    password: process.env.MYSQL_PASSWORD ?? "daya",
    database: process.env.MYSQL_DATABASE ?? "dayacares",
  },
  defaultLoginPassword: process.env.DEFAULT_LOGIN_PASSWORD ?? "Daya@2026",
  sns: {
    androidPlatformArn: process.env.SNS_ANDROID_PLATFORM_ARN ?? "",
    iosPlatformArn: process.env.SNS_IOS_PLATFORM_ARN ?? "",
    opsTopicArn: process.env.SNS_OPS_TOPIC_ARN ?? "",
    whatsappTopicArn: process.env.SNS_WHATSAPP_TOPIC_ARN ?? "",
  },
};
