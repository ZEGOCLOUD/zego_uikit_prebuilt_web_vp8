import { getConfig } from "./tools/util";
import { randomID } from "../../util";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import {
  ZegoDeviceInfo,
  ZegoLocalStreamConfig,
  ZegoPlayerState,
  ZegoPublisherState,
  ZegoPublishStats,
  ZegoPublishStreamConfig,
  ZegoServerResponse,
  ZegoSoundLevelInfo,
  ZegoStreamList,
} from "zego-express-engine-webrtc/sdk/code/zh/ZegoExpressEntity.web";

import {
  ZegoUser,
  ZegoBroadcastMessageInfo,
  ZegoRoomExtraInfo,
} from "zego-express-engine-webrtm/sdk/code/zh/ZegoExpressEntity.d";
import {
  LiveRole,
  ScenarioModel,
  ZegoCloudRemoteMedia,
  ZegoCloudRoomConfig,
} from "../model";
import {
  ZegoCloudUserList,
  ZegoCloudUserListManager,
} from "./tools/UserListManager";

export class ZegoCloudRTCCore {
  static _instance: ZegoCloudRTCCore;
  static _zg: ZegoExpressEngine;
  zum!: ZegoCloudUserListManager;
  _expressConfig!: {
    appID: number;
    userID: string;
    userName: string;
    roomID: string;
    token: string;
  };
  //   static _soundMeter: SoundMeter;
  static getInstance(token: string): ZegoCloudRTCCore {
    const config = getConfig(token);
    if (!ZegoCloudRTCCore._instance && config) {
      ZegoCloudRTCCore._instance = new ZegoCloudRTCCore();
      ZegoCloudRTCCore._instance._expressConfig = config;
      //   ZegoCloudRTCCore._soundMeter = new SoundMeter();
      ZegoCloudRTCCore._zg = new ZegoExpressEngine(
        ZegoCloudRTCCore._instance._expressConfig.appID,
        "wss://webliveroom" +
          ZegoCloudRTCCore._instance._expressConfig.appID +
          "-api.zegocloud.com/ws"
      );
      ZegoCloudRTCCore._instance.zum = new ZegoCloudUserListManager(
        ZegoCloudRTCCore._zg
      );
    }

    return ZegoCloudRTCCore._instance;
  }

  status: {
    loginRsp: boolean;
    videoRefuse: boolean;
    audioRefuse: boolean;
    micDeviceID?: string;
    cameraDeviceID?: string;
    speakerDeviceID?: string;
    videoResolution?: string;
  } = {
    loginRsp: false,
    videoRefuse: false,
    audioRefuse: false,
  };
  remoteStreamMap: { [index: string]: ZegoCloudRemoteMedia } = {};

  async checkWebRTC(): Promise<boolean> {
    const result = await ZegoCloudRTCCore._zg.checkSystemRequirements("webRTC");
    return !!result.result;
  }

  _config: ZegoCloudRoomConfig = {
    // @ts-ignore
    container: undefined, // 挂载容器
    preJoinViewConfig: {
      title: "Join Room", // 标题设置，默认join Room
      invitationLink: window.location.href, // 邀请链接，空则不显示，默认空
    },
    showPreJoinView: true, // 是否显示预览检测页面，默认显示

    turnOnMicrophoneWhenJoining: true, // 是否开启自己的麦克风,默认开启
    turnOnCameraWhenJoining: true, // 是否开启自己的摄像头 ,默认开启
    showMyCameraToggleButton: true, // 是否可以控制自己的麦克风,默认开启
    showMyMicrophoneToggleButton: true, // 是否可以控制体自己的摄像头,默认开启
    showAudioVideoSettingsButton: true,

    showTextChat: true, // 是否开启聊天，默认开启   preJoinViewConfig: boolean，// 通话前检测页面是否需要，默认需要
    showUserList: true, //是否显示成员列表，默认展示
    lowerLeftNotification: {
      showUserJoinAndLeave: true, //是否显示成员进出，默认显示
      showTextChat: true, // 是否显示未读消息，默认显示
    },
    branding: {
      logoURL: "",
    },

    showLeavingView: true, // 离开房间后页面，默认有

    maxUsers: 2, // 房间人数2～20，默认2
    layout: "Default", // 默认Default

    showNonVideoUser: true, // 是否显示无视频用户，默认显示
    showOnlyAudioUser: false, // 是否显示纯音频用户，默认显示

    useFrontFacingCamera: true,

    onJoinRoom: () => {},
    onLeaveRoom: () => {},
    onUserJoin: (user: ZegoUser[]) => {}, // 用户进入回调
    onUserLeave: (user: ZegoUser[]) => {}, // 用户退入回调
    sharedLinks: [], // 产品链接描述
    showScreenSharingButton: true, // 是否显示屏幕共享按钮
    scenario: {
      mode: ScenarioModel.OneONoneCall, // 场景选择
      config: { role: LiveRole.Host }, // 对应场景专有配置
    },

    facingMode: "user",
    joinRoomCallback: () => {}, // 点击加入房间触发
    leaveRoomCallback: () => {}, // 退出房间回调
    userUpdateCallback: () => {},
    showLayoutButton: true, // 是否显示布局切换按钮
    showPinButton: true, // 是否显pin按钮
  };
  setConfig(config: ZegoCloudRoomConfig) {
    if (
      config.scenario &&
      config.scenario.mode === ScenarioModel.LiveStreaming
    ) {
      if (config.showNonVideoUser === true) {
        console.error(
          "【ZEGOCLOUD】 showNonVideoUser have be false scenario.mode is LiveStreaming!!"
        );
        return false;
      }
      config.showNonVideoUser = false;
      config.showOnlyAudioUser = true;
      if (
        config.scenario.config &&
        config.scenario.config.role === LiveRole.Host
      ) {
        if (
          config.turnOnMicrophoneWhenJoining === false &&
          config.turnOnCameraWhenJoining === false &&
          config.showMyCameraToggleButton === false &&
          config.showAudioVideoSettingsButton === false
        ) {
          console.error(
            "【ZEGOCLOUD】 Host could turn on at least one of the camera and the microphone!!"
          );
          return false;
        }
      } else if (
        config.scenario.config &&
        config.scenario.config.role === LiveRole.Audience
      ) {
        if (
          config.turnOnMicrophoneWhenJoining === true ||
          config.turnOnCameraWhenJoining === true ||
          config.showMyCameraToggleButton === true ||
          config.showMyMicrophoneToggleButton === true ||
          config.showAudioVideoSettingsButton === true ||
          config.showScreenSharingButton === true ||
          config.useFrontFacingCamera === true ||
          (!!config.layout && config.layout !== "Grid")
        ) {
          console.error(
            "【ZEGOCLOUD】 Audience cannot configure camera and microphone related params"
          );
          return false;
        }
      }

      if (!config.maxUsers) {
        config.maxUsers = 50;
      }

      if (
        config.scenario.config &&
        config.scenario.config.role === LiveRole.Audience
      ) {
        config.turnOnMicrophoneWhenJoining = false;
        config.turnOnCameraWhenJoining = false;
        config.showMyCameraToggleButton = false;
        config.showMyMicrophoneToggleButton = false;
        config.showAudioVideoSettingsButton = false;
        config.showScreenSharingButton = false;
        config.useFrontFacingCamera = false;
        config.useFrontFacingCamera = false;
        config.showUserList = false;
        config.showPinButton = false;
        config.showLayoutButton = false;
        config.layout = "Grid";
        config.lowerLeftNotification = {
          showTextChat: false,
          showUserJoinAndLeave: false,
        };
      }
    }

    if (
      config.scenario &&
      config.scenario.mode === ScenarioModel.OneONoneCall
    ) {
      if (!config.maxUsers) {
        config.maxUsers = 2;
      }
    }

    config.facingMode &&
      (config.useFrontFacingCamera = config.facingMode === "user");
    config.joinRoomCallback && (config.onJoinRoom = config.joinRoomCallback);
    config.leaveRoomCallback && (config.onLeaveRoom = config.leaveRoomCallback);
    if (config.userUpdateCallback) {
      config.onJoinRoom = (users: ZegoUser[]) => {
        config.userUpdateCallback && config.userUpdateCallback("ADD", users);
      };

      config.onLeaveRoom = (users: ZegoUser[]) => {
        config.userUpdateCallback && config.userUpdateCallback("DELETE", users);
      };
    }

    if (config.preJoinViewConfig && config.preJoinViewConfig.invitationLink) {
      config.sharedLinks = [
        {
          name: "Share the link",
          url: config.preJoinViewConfig.invitationLink,
        },
      ];
    }

    config.preJoinViewConfig &&
      (config.preJoinViewConfig = {
        ...this._config.preJoinViewConfig,
        ...config.preJoinViewConfig,
      });
    config.scenario &&
      config.scenario.config &&
      (config.scenario.config = {
        ...this._config.scenario?.config,
        ...config.scenario.config,
      });

    this._config = { ...this._config, ...config };
    this.zum.scenario =
      this._config.scenario?.mode || ScenarioModel.OneONoneCall;
    this.zum.role = this._config.scenario?.config?.role || LiveRole.Host;
  }

  setPin(userID?: string, pined?: boolean): void {
    this.zum.setPin(userID, pined);
    this.subscribeUserListCallBack &&
      this.subscribeUserListCallBack([...this.zum.remoteUserList]);
  }

  async setMaxScreenNum(num: number) {
    await this.zum.setMaxScreenNum(num);
    this.subscribeUserListCallBack &&
      this.subscribeUserListCallBack([...this.zum.remoteUserList]);
  }

  async setSidebarLayOut(enable: boolean) {
    await this.zum.setSidebarLayOut(enable);
    this.subscribeUserListCallBack &&
      this.subscribeUserListCallBack([...this.zum.remoteUserList]);
  }

  async setShowNonVideo(enable: boolean) {
    await this.zum.setShowNonVideo(enable);
    this.subscribeUserListCallBack &&
      this.subscribeUserListCallBack([...this.zum.remoteUserList]);
  }

  getCameras(): Promise<ZegoDeviceInfo[]> {
    return ZegoCloudRTCCore._zg.getCameras();
  }

  useVideoDevice(
    localStream: MediaStream,
    deviceID: string
  ): Promise<ZegoServerResponse> {
    return ZegoCloudRTCCore._zg.useVideoDevice(localStream, deviceID);
  }

  getMicrophones(): Promise<ZegoDeviceInfo[]> {
    return ZegoCloudRTCCore._zg.getMicrophones();
  }
  getSpeakers(): Promise<ZegoDeviceInfo[]> {
    return ZegoCloudRTCCore._zg.getSpeakers();
  }

  setVolume(media: HTMLVideoElement, volume: number): void {
    media.volume = volume;
  }

  async createStream(source?: ZegoLocalStreamConfig): Promise<MediaStream> {
    return ZegoCloudRTCCore._zg.createStream(source);
  }

  async setVideoConfig(
    media: MediaStream,
    constraints: ZegoPublishStreamConfig
  ) {
    return ZegoCloudRTCCore._zg.setVideoConfig(media, constraints);
  }

  destroyStream(stream: MediaStream): void {
    ZegoCloudRTCCore._zg.destroyStream(stream);
  }

  useCameraDevice(
    media: MediaStream,
    deviceID: string
  ): Promise<ZegoServerResponse> {
    return ZegoCloudRTCCore._zg.useVideoDevice(media, deviceID);
  }

  useMicrophoneDevice(
    media: MediaStream,
    deviceID: string
  ): Promise<ZegoServerResponse> {
    return ZegoCloudRTCCore._zg.useAudioDevice(media, deviceID);
  }

  async useSpeakerDevice(
    media: HTMLMediaElement,
    deviceID: string
  ): Promise<ZegoServerResponse> {
    if (!media.srcObject) {
      return Promise.resolve({ errorCode: -1 });
    }

    try {
      const res = await ZegoCloudRTCCore._zg.useAudioOutputDevice(
        media,
        deviceID
      );
      return { errorCode: res ? 0 : -1 };
    } catch (error) {
      return { errorCode: -1 };
    }
  }

  async enableVideoCaptureDevice(
    localStream: MediaStream,
    enable: boolean
  ): Promise<boolean> {
    return ZegoCloudRTCCore._zg.enableVideoCaptureDevice(localStream, enable);
  }

  async mutePublishStreamVideo(
    localStream: MediaStream,
    enable: boolean
  ): Promise<boolean> {
    return ZegoCloudRTCCore._zg.mutePublishStreamVideo(localStream, enable);
  }
  async mutePublishStreamAudio(
    localStream: MediaStream,
    enable: boolean
  ): Promise<boolean> {
    return ZegoCloudRTCCore._zg.mutePublishStreamAudio(localStream, enable);
  }
  async muteMicrophone(enable: boolean): Promise<boolean> {
    return ZegoCloudRTCCore._zg.muteMicrophone(enable);
  }

  extraInfoKey = "extra_info";
  _roomExtraInfo: { [index: string]: any } = {
    live_status: {
      v: 0,
      u: "xxx",
      r: 0,
    },
  };

  set roomExtraInfo(value: { [index: string]: any }) {
    this._roomExtraInfo = value;
    this.zum.setLiveStates(this._roomExtraInfo.live_status.v);
    this.onRoomLiveStateUpdateCallBack &&
      this.onRoomLiveStateUpdateCallBack(this._roomExtraInfo.live_status.v);
  }
  get roomExtraInfo() {
    return this._roomExtraInfo;
  }
  async setLive(status: "live" | "stop"): Promise<boolean> {
    const setRoomExtraInfo = {
      ...this._roomExtraInfo,
      ...{
        live_status: {
          v: status === "live" ? 1 : 0,
          u: ZegoCloudRTCCore._instance._expressConfig.userID,
          r:
            ZegoCloudRTCCore._instance._config.scenario?.config?.role ===
            LiveRole.Host
              ? 1
              : ZegoCloudRTCCore._instance._config.scenario?.config?.role ===
                LiveRole.Audience
              ? 2
              : 3,
        },
      },
    };
    const res = await ZegoCloudRTCCore._zg.setRoomExtraInfo(
      ZegoCloudRTCCore._instance._expressConfig.roomID,
      "extra_info",
      JSON.stringify(setRoomExtraInfo)
    );
    res.errorCode === 0 && (this.roomExtraInfo = setRoomExtraInfo);
    return res.errorCode === 0;
  }

  async enterRoom(): Promise<number> {
    // 已经登陆过不再登录
    if (this.status.loginRsp) return Promise.resolve(0);
    ZegoCloudRTCCore._zg.off("roomExtraInfoUpdate");
    ZegoCloudRTCCore._zg.off("roomStreamUpdate");
    ZegoCloudRTCCore._zg.off("remoteCameraStatusUpdate");
    ZegoCloudRTCCore._zg.off("remoteMicStatusUpdate");
    ZegoCloudRTCCore._zg.off("playerStateUpdate");
    ZegoCloudRTCCore._zg.off("roomUserUpdate");
    ZegoCloudRTCCore._zg.off("IMRecvBroadcastMessage");
    ZegoCloudRTCCore._zg.off("roomStateUpdate");
    ZegoCloudRTCCore._zg.off("publisherStateUpdate");
    ZegoCloudRTCCore._zg.off("publishQualityUpdate");
    ZegoCloudRTCCore._zg.off("soundLevelUpdate");
    ZegoCloudRTCCore._zg.on(
      "roomStreamUpdate",
      async (
        roomID: string,
        updateType: "DELETE" | "ADD",
        streamList: ZegoStreamList[],
        extendedData?: string
      ) => {
        if (updateType === "ADD") {
          const _streamList = [];
          for (let i = 0; i < streamList.length; i++) {
            const streamInfo = streamList[i];
            try {
              const stream = await this.zum.startPullStream(
                streamInfo.user.userID,
                streamInfo.streamID
              );
              this.remoteStreamMap[streamInfo.streamID] = {
                fromUser: streamInfo.user,
                media: stream,
                micStatus:
                  stream && stream.getAudioTracks().length > 0
                    ? "OPEN"
                    : "MUTE",
                cameraStatus:
                  stream && stream.getVideoTracks().length > 0
                    ? "OPEN"
                    : "MUTE",
                state: "PLAYING",
                streamID: streamInfo.streamID,
              };
              _streamList.push(this.remoteStreamMap[streamInfo.streamID]);
            } catch (error) {
              console.warn("【ZEGOCLOUD】:startPlayingStream error", error);
            }
          }
          this.onRemoteMediaUpdateCallBack &&
            this.onRemoteMediaUpdateCallBack("ADD", _streamList);
        } else {
          const _streamList = [];
          for (let i = 0; i < streamList.length; i++) {
            const streamInfo = streamList[i];
            _streamList.push(this.remoteStreamMap[streamInfo.streamID]);
            ZegoCloudRTCCore._zg.stopPlayingStream(streamInfo.streamID);
            delete this.remoteStreamMap[streamInfo.streamID];
            this.onRemoteMediaUpdateCallBack &&
              this.onRemoteMediaUpdateCallBack("DELETE", _streamList);
          }
        }
      }
    );
    ZegoCloudRTCCore._zg.on(
      "roomExtraInfoUpdate",
      (roomID: string, roomExtraInfoList: ZegoRoomExtraInfo[]) => {
        roomExtraInfoList.forEach((info) => {
          if (info.key === this.extraInfoKey) {
            this.roomExtraInfo = JSON.parse(info.value);
          }
        });
      }
    );
    ZegoCloudRTCCore._zg.on(
      "remoteCameraStatusUpdate",
      (streamID: string, status: "OPEN" | "MUTE") => {
        if (this.remoteStreamMap[streamID]) {
          this.remoteStreamMap[streamID].cameraStatus = status;
          this.onRemoteMediaUpdateCallBack &&
            this.onRemoteMediaUpdateCallBack("UPDATE", [
              this.remoteStreamMap[streamID],
            ]);
        }
      }
    );
    ZegoCloudRTCCore._zg.on(
      "remoteMicStatusUpdate",
      (streamID: string, status: "OPEN" | "MUTE") => {
        if (this.remoteStreamMap[streamID]) {
          this.remoteStreamMap[streamID].micStatus = status;
          this.onRemoteMediaUpdateCallBack &&
            this.onRemoteMediaUpdateCallBack("UPDATE", [
              this.remoteStreamMap[streamID],
            ]);
        }
      }
    );
    ZegoCloudRTCCore._zg.on(
      "playerStateUpdate",
      (streamInfo: ZegoPlayerState) => {
        console.warn("【ZEGOCLOUD】", streamInfo);
        if (this.remoteStreamMap[streamInfo.streamID]) {
          this.remoteStreamMap[streamInfo.streamID].state = streamInfo.state;
          this.onRemoteMediaUpdateCallBack &&
            this.onRemoteMediaUpdateCallBack("UPDATE", [
              this.remoteStreamMap[streamInfo.streamID],
            ]);
        }
      }
    );
    ZegoCloudRTCCore._zg.on(
      "roomUserUpdate",
      (roomID: string, updateType: "DELETE" | "ADD", userList: ZegoUser[]) => {
        this.onRemoteUserUpdateCallBack &&
          this.onRemoteUserUpdateCallBack(roomID, updateType, userList);
        setTimeout(() => {
          this._config.userUpdateCallback &&
            this._config.userUpdateCallback(updateType, userList);
        }, 0);
      }
    );
    ZegoCloudRTCCore._zg.on(
      "IMRecvBroadcastMessage",
      (roomID: string, chatData: ZegoBroadcastMessageInfo[]) => {
        this.onRoomMessageUpdateCallBack &&
          this.onRoomMessageUpdateCallBack(roomID, chatData);
      }
    );

    ZegoCloudRTCCore._zg.on(
      "publisherStateUpdate",
      (streamInfo: ZegoPublisherState) => {
        let state: "DISCONNECTED" | "CONNECTING" | "CONNECTED" = "DISCONNECTED";
        if (streamInfo.state === "PUBLISHING") {
          state = "CONNECTED";
        } else if (streamInfo.state === "NO_PUBLISH") {
          state = "DISCONNECTED";
        } else if (streamInfo.state === "PUBLISH_REQUESTING") {
          state = "CONNECTING";
        }
        this.onNetworkStatusCallBack &&
          this.onNetworkStatusCallBack(
            ZegoCloudRTCCore._instance._expressConfig.roomID,
            "STREAM",
            state
          );
      }
    );

    ZegoCloudRTCCore._zg.on(
      "playQualityUpdate",
      (streamID: string, stats: ZegoPublishStats) => {
        this.onNetworkStatusQualityCallBack &&
          this.onNetworkStatusQualityCallBack(
            streamID,
            Math.max(stats.video.videoQuality, stats.audio.audioQuality)
          );
      }
    );

    ZegoCloudRTCCore._zg.on(
      "publishQualityUpdate",
      (streamID: string, stats: ZegoPublishStats) => {
        this.onNetworkStatusQualityCallBack &&
          this.onNetworkStatusQualityCallBack(
            streamID,
            Math.max(stats.video.videoQuality, stats.audio.audioQuality)
          );
      }
    );
    ZegoCloudRTCCore._zg.on(
      "soundLevelUpdate",
      (soundLevelList: ZegoSoundLevelInfo[]) => {
        this.onSoundLevelUpdateCallBack &&
          this.onSoundLevelUpdateCallBack(soundLevelList);
      }
    );
    const resp = await new Promise<number>(async (res, rej) => {
      ZegoCloudRTCCore._zg.on(
        "roomStateUpdate",
        (
          roomID: string,
          state: "DISCONNECTED" | "CONNECTING" | "CONNECTED",
          errorCode: number,
          extendedData: string
        ) => {
          this.onNetworkStatusCallBack &&
            this.onNetworkStatusCallBack(roomID, "ROOM", state);
          if (state === "CONNECTED" || state === "DISCONNECTED") {
            this.status.loginRsp = errorCode === 0;
            res(errorCode);
          }
        }
      );

      await ZegoCloudRTCCore._zg.loginRoom(
        ZegoCloudRTCCore._instance._expressConfig.roomID,
        ZegoCloudRTCCore._instance._expressConfig.token,
        {
          userID: ZegoCloudRTCCore._instance._expressConfig.userID,
          userName: ZegoCloudRTCCore._instance._expressConfig.userName,
        },
        {
          userUpdate: true,
          maxMemberCount: ZegoCloudRTCCore._instance._config.maxUsers,
        }
      );
    });
    ZegoCloudRTCCore._zg.setSoundLevelDelegate(true, 300);

    return resp;
  }

  publishLocalStream(media: MediaStream): boolean | string {
    if (!media) return false;
    const streamID = this._expressConfig.userID + "_" + randomID(3);
    const res = ZegoCloudRTCCore._zg.startPublishingStream(streamID, media);
    return res && streamID;
  }

  async replaceTrack(
    media: MediaStream,
    mediaStreamTrack: MediaStreamTrack
  ): Promise<ZegoServerResponse> {
    return ZegoCloudRTCCore._zg.replaceTrack(media, mediaStreamTrack);
  }

  private subscribeUserListCallBack!: (userList: ZegoCloudUserList) => void;
  subscribeUserList(callback: (userList: ZegoCloudUserList) => void): void {
    this.subscribeUserListCallBack = callback;
  }

  private onRemoteMediaUpdateCallBack: (
    updateType: "DELETE" | "ADD" | "UPDATE",
    streamList: ZegoCloudRemoteMedia[]
  ) => void = (
    updateType: "DELETE" | "ADD" | "UPDATE",
    streamList: ZegoCloudRemoteMedia[]
  ) => {
    this.zum.streamNumUpdate(updateType, streamList);
    this.subscribeUserListCallBack &&
      this.subscribeUserListCallBack([...this.zum.remoteUserList]);
  };

  onRemoteMediaUpdate(
    func: (
      updateType: "DELETE" | "ADD" | "UPDATE",
      streamList: ZegoCloudRemoteMedia[]
    ) => void
  ) {
    this.onRemoteMediaUpdateCallBack = (
      updateType: "DELETE" | "ADD" | "UPDATE",
      streamList: ZegoCloudRemoteMedia[]
    ) => {
      func(updateType, streamList);
      this.zum.streamNumUpdate(updateType, streamList);
      this.subscribeUserListCallBack &&
        this.subscribeUserListCallBack([...this.zum.remoteUserList]);
    };
  }

  private onNetworkStatusQualityCallBack!: (
    roomID: string,
    level: number
  ) => void;
  onNetworkStatusQuality(func: (roomID: string, level: number) => void) {
    this.onNetworkStatusQualityCallBack = func;
  }

  private onRemoteUserUpdateCallBack!: (
    roomID: string,
    updateType: "DELETE" | "ADD",
    user: ZegoUser[]
  ) => void;
  onRemoteUserUpdate(
    func: (
      roomID: string,
      updateType: "DELETE" | "ADD",
      user: ZegoUser[]
    ) => void
  ) {
    this.onRemoteUserUpdateCallBack = (
      roomID: string,
      updateType: "DELETE" | "ADD",
      user: ZegoUser[]
    ) => {
      func(roomID, updateType, user);
      this.zum.userUpdate(roomID, updateType, user);
      this.subscribeUserListCallBack &&
        this.subscribeUserListCallBack([...this.zum.remoteUserList]);
    };
  }
  private onSoundLevelUpdateCallBack!: (
    soundLevelList: ZegoSoundLevelInfo[]
  ) => void;
  onSoundLevelUpdate(func: (soundLevelList: ZegoSoundLevelInfo[]) => void) {
    this.onSoundLevelUpdateCallBack = func;
  }

  private onRoomLiveStateUpdateCallBack!: (live: 1 | 0) => void;
  onRoomLiveStateUpdate(func: (live: 1 | 0) => void) {
    this.onRoomLiveStateUpdateCallBack = func;
  }
  sendRoomMessage(message: string) {
    return ZegoCloudRTCCore._zg.sendBroadcastMessage(
      ZegoCloudRTCCore._instance._expressConfig.roomID,
      message
    );
  }
  private onRoomMessageUpdateCallBack!: (
    roomID: string,
    info: ZegoBroadcastMessageInfo[]
  ) => void;
  onRoomMessageUpdate(
    func: (roomID: string, info: ZegoBroadcastMessageInfo[]) => void
  ) {
    this.onRoomMessageUpdateCallBack = func;
  }

  NetworkStatusTimer: NodeJS.Timer | null = null;
  private onNetworkStatusCallBack!: (
    roomID: string,
    type: "ROOM" | "STREAM",
    status: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
  ) => void;
  onNetworkStatus(
    func: (
      roomID: string,
      type: "ROOM" | "STREAM",
      status: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
    ) => void
  ) {
    this.onNetworkStatusCallBack = (
      roomID: string,
      type: "ROOM" | "STREAM",
      status: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
    ) => {
      if (status === "CONNECTING") {
        !this.NetworkStatusTimer &&
          (this.NetworkStatusTimer = setTimeout(() => {
            func(roomID, type, "DISCONNECTED");
          }, 60000));
      } else {
        if (this.NetworkStatusTimer) {
          clearTimeout(this.NetworkStatusTimer);
          this.NetworkStatusTimer = null;
        }
      }
      func(roomID, type, status);
    };
  }

  leaveRoom(): void {
    if (!this.status.loginRsp) return;
    ZegoCloudRTCCore._zg.off("roomExtraInfoUpdate");
    ZegoCloudRTCCore._zg.off("roomStreamUpdate");
    ZegoCloudRTCCore._zg.off("remoteCameraStatusUpdate");
    ZegoCloudRTCCore._zg.off("remoteMicStatusUpdate");
    ZegoCloudRTCCore._zg.off("playerStateUpdate");
    ZegoCloudRTCCore._zg.off("roomUserUpdate");
    ZegoCloudRTCCore._zg.off("IMRecvBroadcastMessage");
    ZegoCloudRTCCore._zg.off("roomStateUpdate");
    ZegoCloudRTCCore._zg.off("publisherStateUpdate");
    ZegoCloudRTCCore._zg.off("publishQualityUpdate");
    ZegoCloudRTCCore._zg.off("soundLevelUpdate");
    ZegoCloudRTCCore._zg.setSoundLevelDelegate(false);
    this.onNetworkStatusCallBack = () => {};
    this.onRemoteMediaUpdateCallBack = (
      updateType: "DELETE" | "ADD" | "UPDATE",
      streamList: ZegoCloudRemoteMedia[]
    ) => {
      this.zum.streamNumUpdate(updateType, streamList);
      this.subscribeUserListCallBack &&
        this.subscribeUserListCallBack(this.zum.remoteUserList);
    };
    this.onRemoteUserUpdateCallBack = () => {};
    this.onRoomMessageUpdateCallBack = () => {};
    this.onRoomLiveStateUpdateCallBack = () => {};
    this.subscribeUserListCallBack = () => {};
    this.zum.clearUserList();
    for (let key in this.remoteStreamMap) {
      ZegoCloudRTCCore._zg.stopPlayingStream(key);
    }
    this.remoteStreamMap = {};

    ZegoCloudRTCCore._zg.logoutRoom();
    this.status.loginRsp = false;
  }
}
