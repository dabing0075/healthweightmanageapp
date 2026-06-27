import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || '应用';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'myapp';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": "有靓又健体重日志",
    "slug": "health-weight-app",
    "extra": { "eas": { "projectId": "81be50e4-cdbe-4ab3-972e-d946702cae9e" } },
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "healthweight",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.healthweight.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.healthweight.app"
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许健康体重管理App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许健康体重管理App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许健康体重管理App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `健康体重管理App需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": `健康体重管理App需要访问相机以拍摄照片和视频。`,
          "microphonePermission": `健康体重管理App需要访问麦克风以录制视频声音。`,
          "recordAudioAndroid": true
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/icon.png",
          "color": "#F26B3A"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
