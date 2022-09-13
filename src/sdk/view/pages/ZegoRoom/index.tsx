import React, { RefObject } from "react";
import {
  SoundLevelMap,
  ZegoBroadcastMessageInfo2,
  ZegoBrowserCheckProp,
  ZegoCloudRemoteMedia,
  ZegoNotification,
} from "../../../model";
import ZegoRoomCss from "./index.module.scss";
import {
  ZegoUser,
  ZegoBroadcastMessageInfo,
} from "zego-express-engine-webrtm/sdk/code/zh/ZegoExpressEntity.d";

import { ZegoTimer } from "./components/zegoTimer";
import { ZegoOne2One } from "./components/zegoOne2One";
import { ZegoMessage } from "./components/zegoMessage";
import {
  getBrowser,
  getVideoResolution,
  randomNumber,
  throttle,
} from "../../../util";
import { ZegoSettingsAlert } from "../../components/zegoSetting";
import { ZegoModelShow } from "../../components/zegoModel";
import { ZegoToast } from "../../components/zegoToast";
import { ZegoGridLayout } from "./components/zegoGridLayout";
import { ZegoSidebarLayout } from "./components/zegoSidebarLayout";
import { ZegoCloudUserList } from "../../../modules/tools/UserListManager";
import { ZegoRoomInvite } from "./components/zegoRoomInvite";
import { ZegoUserList } from "./components/zegoUserList";
import { ZegoSoundLevelInfo } from "zego-express-engine-webrtc/sdk/code/zh/ZegoExpressEntity.web";
import { ZegoScreenSharingLayout } from "./components/ZegoScreenSharingLayout";
export class ZegoRoom extends React.Component<ZegoBrowserCheckProp> {
  state: {
    localStream: undefined | MediaStream;
    remoteStreamInfo: ZegoCloudRemoteMedia | undefined;
    layOutStatus: "ONE_VIDEO" | "INVITE" | "USER_LIST" | "MESSAGE";
    zegoCloudUserList: ZegoCloudUserList;
    messageList: ZegoBroadcastMessageInfo2[];
    notificationList: ZegoNotification[];
    micOpen: boolean;
    cameraOpen: boolean;
    showSettings: boolean;
    isNetworkPoor: boolean;
    connecting: boolean;
    firstLoading: boolean;
    seletMic: string | undefined;
    seletSpeaker: string | undefined;
    seletCamera: string | undefined;
    seletVideoResolution: string;
    showNonVideoUser: boolean;
    videoShowNumber: number; // 展示视频的数量
    gridRowNumber: number; // Grid 行数
    layout: "Default" | "Grid" | "Sidebar";
    showLayoutSettingsModel: boolean; // 是否显示布局设置弹窗
    isLayoutChanging: boolean; // 布局是否正在变更中
    soundLevel: SoundLevelMap;
    isScreenSharingBySelf: boolean; // 自己是否正在屏幕共享
    screenSharingStream: undefined | MediaStream; // 本地屏幕共享流
    screenSharingUserList: ZegoCloudUserList; // 屏幕共享列表
  } = {
    localStream: undefined,
    remoteStreamInfo: undefined,
    layOutStatus: "ONE_VIDEO",
    zegoCloudUserList: [],
    messageList: [],
    notificationList: [],
    micOpen: !!this.props.core._config.turnOnMicrophoneWhenJoining,
    cameraOpen: !!this.props.core._config.turnOnCameraWhenJoining,
    showSettings: false,
    isNetworkPoor: false,
    connecting: false,
    firstLoading: true,
    seletMic: this.props.core.status.micDeviceID,
    seletSpeaker: this.props.core.status.speakerDeviceID,
    seletCamera: this.props.core.status.cameraDeviceID,
    seletVideoResolution: this.props.core.status.videoResolution || "360",
    videoShowNumber: 9,
    gridRowNumber: 3,
    layout: this.props.core._config.layout || "Default",
    showLayoutSettingsModel: false,
    isLayoutChanging: false,
    soundLevel: {},
    showNonVideoUser: this.props.core._config.showNonVideoUser as boolean,
    isScreenSharingBySelf: false,
    screenSharingStream: undefined,
    screenSharingUserList: [],
  };

  settingsRef: RefObject<HTMLDivElement> = React.createRef();
  moreRef: RefObject<HTMLDivElement> = React.createRef();

  micStatus: -1 | 0 | 1 = !!this.props.core._config.turnOnMicrophoneWhenJoining
    ? 1
    : 0;
  cameraStatus: -1 | 0 | 1 = !!this.props.core._config.turnOnCameraWhenJoining
    ? 1
    : 0;
  notifyTimer!: NodeJS.Timeout;
  msgDelayed = true; // 5s不显示
  localUserPin = false;
  localStreamID = "";
  screenSharingStreamID = "";
  isCreatingScreenSharing = false;
  fullScreen = false;
  userUpdateCallBack = () => {};
  componentDidMount() {
    this.computeByResize();
    setTimeout(() => {
      this.msgDelayed = false;
    }, 5000);
    this.initSDK();
    // 点击其他区域时, 隐藏更多弹窗)
    document.addEventListener("click", this.onOpenSettings);
    window.addEventListener("resize", this.onWindowResize.bind(this));
  }
  componentDidUpdate(
    preProps: ZegoBrowserCheckProp,
    preState: {
      localStream: undefined | MediaStream;
      remoteStreamInfo: ZegoCloudRemoteMedia | undefined;
      layOutStatus: "ONE_VIDEO" | "INVITE" | "USER_LIST" | "MESSAGE";
      zegoCloudUserList: ZegoCloudUserList;
      messageList: ZegoBroadcastMessageInfo2[];
      notificationList: ZegoNotification[];
      micOpen: boolean;
      cameraOpen: boolean;
      showMore: boolean;
      layout: string;
      videoShowNumber: number;
      isScreenSharingBySelf: boolean;
      screenSharingUserList: ZegoCloudUserList;
    }
  ) {
    if (
      (preState.notificationList.length > 0 &&
        this.state.notificationList.length > 0 &&
        preState.notificationList[preState.notificationList.length - 1]
          .messageID !==
          this.state.notificationList[this.state.notificationList.length - 1]
            .messageID) ||
      (preState.notificationList.length === 0 &&
        this.state.notificationList.length > 0)
    ) {
      this.notifyTimer && clearTimeout(this.notifyTimer);
      this.notifyTimer = setTimeout(() => {
        this.setState({
          notificationList: [],
        });
      }, 3000);
    }
    if (preState.layout !== this.state.layout) {
      this.computeByResize();
    }
    if (preState.videoShowNumber !== this.state.videoShowNumber) {
      if (preState.zegoCloudUserList === this.state.zegoCloudUserList) {
        this.userUpdateCallBack();
      }
    }
  }
  componentWillUnmount() {
    document.removeEventListener("click", this.onOpenSettings);
    window.removeEventListener("resize", this.onWindowResize.bind(this));
  }
  async initSDK() {
    this.props.core.onNetworkStatusQuality((roomID: string, level: number) => {
      this.setState({
        isNetworkPoor: level > 2,
      });
    });
    this.props.core.onNetworkStatus(
      (
        roomID: string,
        type: "ROOM" | "STREAM",
        status: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
      ) => {
        if (status === "DISCONNECTED" && type === "ROOM") {
          this.props.core.leaveRoom();
          this.props.leaveRoom && this.props.leaveRoom();
        } else if (status === "CONNECTING" && type !== "STREAM") {
          this.setState({
            connecting: true,
          });
        } else {
          this.setState({
            connecting: false,
            firstLoading: false,
          });
        }
      }
    );
    this.props.core.onRemoteUserUpdate(
      (roomID: string, updateType: "DELETE" | "ADD", userList: ZegoUser[]) => {
        let notificationList: ZegoNotification[] = [];
        if (
          this.props.core._config.lowerLeftNotification?.showUserJoinAndLeave
        ) {
          userList.map((u) => {
            notificationList.push({
              content:
                u.userName +
                " " +
                (updateType === "ADD" ? "enter" : "quite") +
                " the room",
              type: "USER",
              userName: u.userName,
              messageID: randomNumber(5),
            });
          });
        }

        this.setState((state: { notificationList: string[] }) => {
          return {
            notificationList: [...state.notificationList, ...notificationList],
          };
        });
      }
    );
    this.props.core.onRemoteMediaUpdate(
      (
        updateType: "DELETE" | "ADD" | "UPDATE",
        streamList: ZegoCloudRemoteMedia[]
      ) => {
        if (updateType === "ADD" || updateType === "UPDATE") {
          this.setState({
            remoteStreamInfo: streamList[0],
          });
        } else if (updateType === "DELETE") {
          this.setState({
            remoteStreamInfo: undefined,
          });
        }
      }
    );
    this.props.core.onRoomMessageUpdate(
      (roomID: string, messageList: ZegoBroadcastMessageInfo[]) => {
        this.setState(
          (state: {
            messageList: ZegoBroadcastMessageInfo2[];
            notificationList: ZegoNotification[];
          }) => {
            let lowerLeftNotification: ZegoNotification[] = [];
            if (
              this.state.layOutStatus !== "MESSAGE" &&
              this.props.core._config.lowerLeftNotification?.showTextChat
            ) {
              lowerLeftNotification = [
                ...state.notificationList,
                ...messageList.map<ZegoNotification>((m) => {
                  return {
                    content: m.message,
                    type: "MSG",
                    userName: m.fromUser.userName,
                    messageID: m.messageID,
                  };
                }),
              ];
            }
            return {
              messageList: [...state.messageList, ...messageList],
              notificationList: lowerLeftNotification,
            };
          }
        );
      }
    );
    this.props.core.subscribeUserList((userList) => {
      this.userUpdateCallBack();
      this.setState({ zegoCloudUserList: userList });
    });
    this.props.core.subscribeScreenStream((userList) => {
      this.setState({ screenSharingUserList: userList });
    });
    this.props.core.onSoundLevelUpdate(
      (soundLevelList: ZegoSoundLevelInfo[]) => {
        let list: SoundLevelMap = {};
        soundLevelList.forEach((s) => {
          let userId = s.streamID.split("_")[1];
          if (list[userId]) {
            list[userId][s.streamID] = Math.floor(s.soundLevel);
          } else {
            list[userId] = {
              [s.streamID]: Math.floor(s.soundLevel),
            };
          }
        });
        this.setState({
          soundLevel: list,
        });
      }
    );
    this.props.core.onScreenSharingEnded((stream: MediaStream) => {
      if (stream === this.state.screenSharingStream) {
        this.closeScreenSharing();
      }
    });
    const logInRsp = await this.props.core.enterRoom();
    logInRsp === 0 && this.createStream();
  }

  async createStream(): Promise<boolean> {
    if (
      !this.props.core._config.turnOnCameraWhenJoining &&
      !this.props.core._config.turnOnMicrophoneWhenJoining &&
      !this.props.core._config.showMyCameraToggleButton &&
      !this.props.core._config.showMyMicrophoneToggleButton
    ) {
      return false;
    }
    if (
      !this.props.core.status.videoRefuse ||
      !this.props.core.status.audioRefuse
    ) {
      try {
        const solution = getVideoResolution(this.state.seletVideoResolution);
        const localStream = await this.props.core.createStream({
          camera: {
            video: !this.props.core.status.videoRefuse,
            audio: !this.props.core.status.audioRefuse,
            videoInput: this.state.seletCamera,
            audioInput: this.state.seletMic,
            videoQuality: 4,
            ...solution,
          },
        });

        this.props.core.enableVideoCaptureDevice(
          localStream,
          !!this.props.core._config.turnOnCameraWhenJoining
        );
        this.props.core.muteMicrophone(
          !this.props.core._config.turnOnMicrophoneWhenJoining
        );
        this.setState({
          localStream,
        });
        const res = this.props.core.publishLocalStream(localStream);
        if (res !== false) {
          this.localStreamID = res as string;
        }
        return true;
      } catch (error) {
        console.error(
          "【ZEGOCLOUD】createStream or publishLocalStream failed,Reason: ",
          JSON.stringify(error)
        );
        return false;
      }
    } else {
      return false;
    }
  }

  async toggleMic() {
    if (this.props.core.status.audioRefuse) {
      ZegoModelShow({
        header: "Equipment authorization",
        contentText:
          "We can't detect your devices. Please check your devices and allow us access your devices in your browser's address bar. Then reload this page and try again.",
        okText: "Okay",
      });
      return;
    }

    if (this.micStatus === -1) return;
    this.micStatus = -1;

    let result;
    if (
      this.state.localStream &&
      this.state.localStream.getAudioTracks().length > 0
    ) {
      result = await this.props.core.muteMicrophone(this.state.micOpen);
    }

    this.micStatus = !this.state.micOpen ? 1 : 0;
    if (result) {
      ZegoToast({
        content: "The microphone is " + (this.micStatus ? "on" : "off"),
      });
      result &&
        this.setState({
          micOpen: !!this.micStatus,
        });
    }
  }

  async toggleCamera(): Promise<boolean> {
    if (this.props.core.status.videoRefuse) {
      ZegoModelShow({
        header: "Equipment authorization",
        contentText:
          "We can't detect your devices. Please check your devices and allow us access your devices in your browser's address bar. Then reload this page and try again.",
        okText: "Okay",
      });
      return Promise.resolve(false);
    }
    if (this.cameraStatus === -1) return Promise.resolve(false);
    this.cameraStatus = -1;

    let result;
    if (
      this.state.localStream &&
      this.state.localStream.getVideoTracks().length > 0
    ) {
      result = await this.props.core.enableVideoCaptureDevice(
        this.state.localStream,
        !this.state.cameraOpen
      );
    }
    this.cameraStatus = !this.state.cameraOpen ? 1 : 0;
    if (result) {
      ZegoToast({
        content: "The camera is " + (this.cameraStatus ? "on" : "off"),
      });
      result &&
        this.setState({
          cameraOpen: !!this.cameraStatus,
        });
    }
    return !!result;
  }
  async toggleScreenSharing() {
    if (this.state.isScreenSharingBySelf) {
      this.closeScreenSharing();
    } else {
      this.createScreenSharing();
    }
  }
  async createScreenSharing() {
    if (this.state.screenSharingUserList.length > 0) {
      ZegoToast({
        content: `${this.state.screenSharingUserList[0].userName} is presenting now. You cannot share your screen.`,
      });
      return;
    }
    if (this.isCreatingScreenSharing) return;
    this.isCreatingScreenSharing = true;
    try {
      const screenSharingStream = await this.props.core.createStream({
        screen: { videoQuality: 2, bitRate: 1500, frameRate: 15, audio: true },
      });
      const streamID = this.props.core.publishLocalStream(
        screenSharingStream,
        "screensharing"
      );
      streamID && (this.screenSharingStreamID = streamID as string);
      this.setState({
        isScreenSharingBySelf: true,
        screenSharingStream: screenSharingStream,
      });
    } catch (error: any) {
      if (error?.code === 1103043) {
        ZegoModelShow({
          header: "Notice",
          contentText: "Your browser does not support screen sharing.",
          okText: "Okay",
        });
      } else if (error?.code === 1103010 && error?.msg.includes("Permission")) {
        ZegoModelShow({
          header: "Grant access to share your screen",
          contentText:
            "Your system does not have access to share a screen from the browser. Please grant access to share your screen on your system settings.",
          okText: "Okay",
        });
      } else if (error?.code !== 1103042) {
        ZegoToast({
          content: `Failed to present your screen. error code: ${
            error?.code || -1
          }`,
        });
      }
    }
    this.isCreatingScreenSharing = false;
  }
  closeScreenSharing() {
    try {
      this.screenSharingStreamID &&
        this.props.core.stopPublishingStream(this.screenSharingStreamID);
      this.state.screenSharingStream &&
        this.props.core.destroyStream(this.state.screenSharingStream);
      this.setState({
        isScreenSharingBySelf: false,
      });
    } catch (error) {
      console.error(error);
    }
  }
  toggleLayOut(layOutStatus: "ONE_VIDEO" | "INVITE" | "USER_LIST" | "MESSAGE") {
    this.setState(
      (state: {
        layOutStatus: "ONE_VIDEO" | "INVITE" | "USER_LIST" | "MESSAGE";
      }) => {
        return {
          layOutStatus:
            state.layOutStatus === layOutStatus ? "ONE_VIDEO" : layOutStatus,
        };
      },
      () => {
        this.computeByResize();
      }
    );
  }

  async sendMessage(msg: string) {
    let messageID = randomNumber(5);
    this.setState((state: { messageList: ZegoBroadcastMessageInfo2[] }) => {
      return {
        messageList: [
          ...state.messageList,
          {
            fromUser: {
              userID: this.props.core._expressConfig.userID,
              userName: this.props.core._expressConfig.userName,
            },
            message: msg,
            sendTime: Date.now(),
            messageID,
            status: "SENDING",
          },
        ],
      };
    });
    let resp = {} as any;
    try {
      resp = await this.props.core.sendRoomMessage(msg);
    } catch (err) {
      console.error("【ZEGOCLOUD】sendMessage failed!", JSON.stringify(err));
    }
    this.setState((state: { messageList: ZegoBroadcastMessageInfo2[] }) => {
      const _messageList = state.messageList.map((msg) => {
        if (msg.messageID === messageID) {
          msg.status = resp?.errorCode === 0 ? "SENDED" : "FAILED";
        }
        return msg;
      });
      console.log(_messageList);
      return {
        messageList: _messageList,
      };
    });
  }

  openSettings() {
    this.setState({
      showSettings: !this.state.showSettings,
    });
  }
  onOpenSettings = (event: any) => {
    if (
      this.settingsRef.current === event.target ||
      this.settingsRef.current?.contains(event.target as Node) ||
      this.moreRef.current === event.target ||
      this.moreRef.current?.contains(event.target as Node)
    ) {
    } else {
      this.setState({
        showSettings: false,
      });
    }
  };
  handleSetting() {
    ZegoSettingsAlert({
      core: this.props.core,
      theme: "black",
      initDevices: {
        mic: this.state.seletMic,
        cam: this.state.seletCamera,
        speaker: this.state.seletSpeaker,
        videoResolve: this.state.seletVideoResolution,
        showNonVideoUser: this.state.showNonVideoUser,
      },
      closeCallBack: () => {},
      onMicChange: (deviceID: string) => {
        this.setState(
          {
            seletMic: deviceID,
          },
          () => {
            if (this.state.localStream) {
              this.props.core.useMicrophoneDevice(
                this.state.localStream,
                deviceID
              );
            }
          }
        );
      },
      onCameraChange: (deviceID: string) => {
        this.setState(
          {
            seletCamera: deviceID,
          },
          async () => {
            if (this.state.localStream) {
              await this.props.core.useCameraDevice(
                this.state.localStream,
                deviceID
              );
              this.setState({
                cameraOpen: true,
              });
            }
          }
        );
      },
      onSpeakerChange: (deviceID: string) => {
        this.setState(
          {
            seletSpeaker: deviceID,
          },
          () => {
            document
              .querySelectorAll("video")
              .forEach((el: any) => el.setSinkId(deviceID));
          }
        );
      },
      onVideoResolutionChange: (level: string) => {
        this.setState(
          {
            seletVideoResolution: level,
          },
          () => {
            if (this.state.localStream) {
              const { width, height, bitrate, frameRate } =
                getVideoResolution(level);
              this.props.core.setVideoConfig(this.state.localStream, {
                width,
                height,
                maxBitrate: bitrate,
                frameRate,
              });
            }
          }
        );
      },
      onShowNonVideoChange: (selected: boolean) => {
        this.props.core._config.showNonVideoUser = selected;
        this.setState({
          showNonVideoUser: selected,
        });
      },
    });
  }
  handleLeave() {
    ZegoModelShow({
      header: "Leave the room",
      contentText: "Are you sure to leave the room?",
      okText: "Confirm",
      cancelText: "Cancel",
      onOk: () => {
        this.props.core._config.turnOnCameraWhenJoining = this.state.cameraOpen;
        this.props.core._config.turnOnMicrophoneWhenJoining =
          this.state.micOpen;
        this.props.core.status.micDeviceID = this.state.seletMic;
        this.props.core.status.cameraDeviceID = this.state.seletCamera;
        this.props.core.status.speakerDeviceID = this.state.seletSpeaker;
        this.props.core.status.videoResolution =
          this.state.seletVideoResolution;
        this.leaveRoom();
      },
    });
  }
  leaveRoom() {
    this.state.isScreenSharingBySelf && this.closeScreenSharing();
    this.state.localStream &&
      this.props.core.destroyStream(this.state.localStream);
    this.props.core.leaveRoom();
    this.props.leaveRoom && this.props.leaveRoom();
  }

  computeByResize() {
    const width = Math.max(document.body.clientWidth, 826);
    const height = Math.max(document.body.clientHeight, 280);
    let videoShowNumber = 0,
      gridRowNumber = 0;
    if (this.getScreenSharingUser.length > 0) {
      //Screen Sidebar
      const videWrapHight =
        height - (this.props.core._config.branding?.logoURL ? 64 : 0) - 84;
      const n = parseInt(String(videWrapHight / 124));
      videoShowNumber = Math.min(
        n * 124 + (n - 1) * 10 <= videWrapHight ? n : n - 1,
        5
      );
      this.setState({
        videoShowNumber: videoShowNumber,
      });
      if (this.fullScreen) {
        this.props.core.setMaxScreenNum(0);
      } else {
        this.props.core.setMaxScreenNum(
          this.getShownUser().length > videoShowNumber
            ? videoShowNumber - 1
            : videoShowNumber
        );
      }
      this.props.core.setSidebarLayOut(false);
      return;
    }
    if (this.state.layout === "Sidebar") {
      // Sidebar
      const videWrapHight =
        height - (this.props.core._config.branding?.logoURL ? 64 : 0) - 84;
      const n = parseInt(String(videWrapHight / 124));
      videoShowNumber = Math.min(
        n * 124 + (n - 1) * 10 <= videWrapHight ? n : n - 1,
        5
      );
      this.props.core.setSidebarLayOut(true);
      this.setState({
        videoShowNumber: videoShowNumber,
      });

      this.props.core.setMaxScreenNum(
        this.getShownUser().length > videoShowNumber + 1
          ? videoShowNumber
          : videoShowNumber + 1
      );
      return;
    }

    if (this.state.layout === "Grid" || this.state.layout === "Default") {
      if (height < 406 - (this.props.core._config.branding?.logoURL ? 0 : 64)) {
        const videoWrapWidth =
          width - 32 - (this.state.layOutStatus === "ONE_VIDEO" ? 0 : 350);
        const n = parseInt(String(videoWrapWidth / 160));
        videoShowNumber = Math.min(
          n * 160 + (n - 1) * 10 <= videoWrapWidth ? n : n - 1,
          10
        );
        gridRowNumber = 1;
      } else if (
        height <
        540 - (this.props.core._config.branding?.logoURL ? 0 : 64)
      ) {
        const videoWrapWidth =
          width - 32 - (this.state.layOutStatus === "ONE_VIDEO" ? 0 : 350);
        const n = parseInt(String(videoWrapWidth / 124));
        videoShowNumber = Math.min(
          n * 124 + (n - 1) * 10 <= videoWrapWidth ? 2 * n : 2 * (n - 1),
          10
        );
        gridRowNumber = 2;
      } else {
        videoShowNumber = 9;
        gridRowNumber = 3;
      }
      this.props.core.setSidebarLayOut(false);
      this.setState({
        videoShowNumber: videoShowNumber,
        gridRowNumber: gridRowNumber,
      });

      this.props.core.setMaxScreenNum(
        this.getShownUser().length > videoShowNumber
          ? videoShowNumber - 1
          : videoShowNumber
      );
      return;
    }
  }
  onWindowResize = throttle(this.computeByResize.bind(this), 500);
  showLayoutSettings(show: boolean) {
    this.setState({
      showLayoutSettingsModel: show,
    });
  }
  async changeLayout(type: string) {
    if (this.state.isLayoutChanging) return;
    return new Promise((resolve, reject) => {
      this.userUpdateCallBack = () => {
        this.setState({
          isLayoutChanging: false,
        });
        resolve(true);
      };
      if (type === "Grid" || type === "Default") {
        this.props.core.setPin();
        this.localUserPin = false;
      }
      this.setState({
        isLayoutChanging: true,
        layout: type,
      });
      this.props.core.setSidebarLayOut(type === "Sidebar");
      setTimeout(() => {
        this.setState({
          isLayoutChanging: false,
        });
        resolve(false);
      }, 5000);
    });
  }

  getShownUser(forceShowNonVideoUser = false) {
    const shownUser = [
      {
        userID: this.props.core._expressConfig.userID,
        userName: this.props.core._expressConfig.userName,
        pin: this.localUserPin,
        streamList: [
          {
            media: this.state.localStream!,
            fromUser: {
              userID: this.props.core._expressConfig.userID,
              userName: this.props.core._expressConfig.userName,
            },
            micStatus: this.state.micOpen ? "OPEN" : "MUTE",
            cameraStatus: this.state.cameraOpen ? "OPEN" : "MUTE",
            state: "PLAYING",
            streamID: this.localStreamID,
          },
        ],
      },
      ...this.state.zegoCloudUserList,
    ].filter((item) => {
      if (!this.props.core._config.showNonVideoUser && !forceShowNonVideoUser) {
        if (item.streamList && item.streamList[0] && item.streamList[0].media) {
          if (item.streamList[0].cameraStatus === "OPEN") {
            return true;
          } else if (
            this.props.core._config.showOnlyAudioUser &&
            item.streamList[0].micStatus === "OPEN"
          ) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return true;
      }
    });

    return shownUser as ZegoCloudUserList;
  }
  get getScreenSharingUser(): ZegoCloudUserList {
    if (this.state.isScreenSharingBySelf) {
      return [
        {
          userID: this.props.core._expressConfig.userID,
          userName: this.props.core._expressConfig.userName,
          pin: false,
          streamList: [
            {
              media: this.state.screenSharingStream!,
              fromUser: {
                userID: this.props.core._expressConfig.userID,
                userName: this.props.core._expressConfig.userName,
              },
              micStatus: "OPEN",
              cameraStatus: "OPEN",
              state: "PLAYING",
              streamID: this.screenSharingStreamID,
            },
          ],
        },
      ];
    } else {
      return this.state.screenSharingUserList;
    }
  }
  getHiddenUser() {
    const hiddenUser = [
      {
        userID: this.props.core._expressConfig.userID,
        userName: this.props.core._expressConfig.userName + "（You）",
        pin: this.localUserPin,
        streamList: [
          {
            media: this.state.localStream!,
            fromUser: {
              userID: this.props.core._expressConfig.userID,
              userName: this.props.core._expressConfig.userName,
            },
            micStatus: this.state.micOpen ? "OPEN" : "MUTE",
            cameraStatus: this.state.cameraOpen ? "OPEN" : "MUTE",
            state: "PLAYING",
            streamID: this.localStreamID,
          },
        ],
      },
      ...this.state.zegoCloudUserList,
    ].filter((item) => {
      if (
        !this.props.core._config.showNonVideoUser &&
        item.streamList &&
        item.streamList[0] &&
        item.streamList[0].media &&
        item.streamList[0].cameraStatus !== "OPEN" &&
        !this.props.core._config.showOnlyAudioUser &&
        item.streamList[0].micStatus === "OPEN"
      ) {
        return true;
      } else {
        return false;
      }
    });

    return (
      <>
        {hiddenUser.map((user) => {
          return (
            <audio
              autoPlay
              muted={user.userID === this.props.core._expressConfig.userID}
              key={user.userID + "_hiddenAudio"}
              ref={(el) => {
                el &&
                  el.srcObject !== user.streamList[0].media &&
                  (el.srcObject = user.streamList[0].media);
              }}
            ></audio>
          );
        })}
      </>
    );
  }
  getLayoutScreen() {
    if (this.getScreenSharingUser.length > 0) {
      return (
        <ZegoScreenSharingLayout
          handleSetPin={this.handleSetPin.bind(this)}
          userList={this.getShownUser()}
          videoShowNumber={this.state.videoShowNumber}
          selfInfo={{
            userID: this.props.core._expressConfig.userID,
          }}
          screenSharingUser={this.getScreenSharingUser[0]}
          soundLevel={this.state.soundLevel}
          handleFullScreen={this.handleFullScreen.bind(this)}
        ></ZegoScreenSharingLayout>
      );
    }
    if (
      (this.state.layout === "Default" && this.getShownUser().length < 3) ||
      this.getShownUser().length < 2
    ) {
      return (
        <ZegoOne2One
          onLocalStreamPaused={async () => {
            await this.props.core.enableVideoCaptureDevice(
              this.state.localStream!,
              !this.state.cameraOpen
            );
            this.props.core.enableVideoCaptureDevice(
              this.state.localStream!,
              this.state.cameraOpen
            );
          }}
          selfInfo={{
            userID: this.props.core._expressConfig.userID,
          }}
          handleSetPin={this.handleSetPin.bind(this)}
          userList={this.getShownUser()}
          soundLevel={this.state.soundLevel}
        ></ZegoOne2One>
      );
    }
    if (
      (this.state.layout === "Grid" && this.getShownUser().length > 1) ||
      (this.state.layout === "Default" && this.getShownUser().length > 2)
    ) {
      return (
        <ZegoGridLayout
          userList={this.getShownUser()}
          videoShowNumber={this.state.videoShowNumber}
          gridRowNumber={this.state.gridRowNumber}
          selfInfo={{
            userID: this.props.core._expressConfig.userID,
          }}
          handleSetPin={this.handleSetPin.bind(this)}
          soundLevel={this.state.soundLevel}
        ></ZegoGridLayout>
      );
    }
    if (this.state.layout === "Sidebar" && this.getShownUser().length > 1) {
      return (
        <ZegoSidebarLayout
          handleSetPin={this.handleSetPin.bind(this)}
          userList={this.getShownUser()}
          videoShowNumber={this.state.videoShowNumber}
          selfInfo={{
            userID: this.props.core._expressConfig.userID,
          }}
          soundLevel={this.state.soundLevel}
        ></ZegoSidebarLayout>
      );
    }
  }
  handleSetPin(userID: string) {
    if (userID === this.props.core._expressConfig.userID) {
      this.localUserPin = !this.localUserPin;
      this.props.core.setPin();
    } else {
      this.localUserPin = false;
      this.props.core.setPin(userID);
    }
    this.props.core.setSidebarLayOut(
      this.getScreenSharingUser.length > 0 ? false : true
    );
    this.setState({ layout: "Sidebar" });
  }
  handleFullScreen(fullScreen: boolean) {
    this.fullScreen = fullScreen;
    this.computeByResize();
  }
  render(): React.ReactNode {
    const startIndex =
      this.state.notificationList.length < 4
        ? 0
        : this.state.notificationList.length - 2;

    return (
      <div className={ZegoRoomCss.ZegoRoom}>
        {(this.props.core._config.branding?.logoURL ||
          this.props.core._config.roomTimerDisplayed) && (
          <div className={ZegoRoomCss.header}>
            {this.props.core._config.branding?.logoURL && (
              <img
                className={ZegoRoomCss.logo}
                src={this.props.core._config.branding?.logoURL}
                alt="logo"
              />
            )}
            {this.props.core._config.roomTimerDisplayed && (
              <ZegoTimer></ZegoTimer>
            )}
          </div>
        )}
        <div className={ZegoRoomCss.content}>
          <div className={ZegoRoomCss.contentLeft}>
            {this.getLayoutScreen()}
            {this.getHiddenUser()}
            <div className={ZegoRoomCss.notify}>
              {this.state.notificationList
                .slice(startIndex)
                .map((notify, index) => {
                  if (notify.type === "MSG") {
                    return (
                      <div key={index} className={ZegoRoomCss.notifyContent}>
                        <h5>{notify.userName}</h5>
                        <span>{notify.content}</span>
                      </div>
                    );
                  } else {
                    return (
                      <div key={index} className={ZegoRoomCss.notifyContent}>
                        <span className={ZegoRoomCss.nowrap}>
                          {notify.content}
                        </span>
                      </div>
                    );
                  }
                })}
            </div>
            {this.state.isNetworkPoor && (
              <div className={ZegoRoomCss.network}></div>
            )}
          </div>
          <div
            className={ZegoRoomCss.contentRight}
            style={{
              display:
                this.state.layOutStatus !== "ONE_VIDEO" ? "flex" : "none",
            }}
          >
            <div className={ZegoRoomCss.listHeader}>
              {this.state.layOutStatus === "INVITE" && "Room details"}
              {this.state.layOutStatus === "USER_LIST" && "Room members"}
              {this.state.layOutStatus === "MESSAGE" && "Room messages"}
              <span
                className={ZegoRoomCss.listHeaderClose}
                onClick={() => {
                  this.setState({
                    layOutStatus: "ONE_VIDEO",
                  });
                }}
              ></span>
            </div>
            <div className={ZegoRoomCss.listContent}>
              {this.state.layOutStatus === "INVITE" && (
                <ZegoRoomInvite core={this.props.core}></ZegoRoomInvite>
              )}
              {this.state.layOutStatus === "USER_LIST" && (
                <ZegoUserList
                  core={this.props.core}
                  userList={this.getShownUser(true)}
                  selfUserID={this.props.core._expressConfig.userID}
                  handleSetPin={this.handleSetPin.bind(this)}
                  soundLevel={this.state.soundLevel}
                ></ZegoUserList>
              )}
              {this.state.layOutStatus === "MESSAGE" && (
                <ZegoMessage
                  messageList={this.state.messageList}
                  sendMessage={(msg: string) => {
                    this.sendMessage(msg);
                  }}
                  selfUserID={this.props.core._expressConfig.userID}
                ></ZegoMessage>
              )}
            </div>
          </div>
        </div>
        <div className={ZegoRoomCss.footer}>
          {this.props.core._config.preJoinViewConfig?.invitationLink && (
            <div
              className={ZegoRoomCss.inviteButton}
              onClick={() => {
                this.toggleLayOut("INVITE");
              }}
            ></div>
          )}

          <div className={ZegoRoomCss.handlerMiddle}>
            {this.props.core._config.showMyMicrophoneToggleButton && (
              <div
                className={`${ZegoRoomCss.micButton} ${
                  !this.state.micOpen && ZegoRoomCss.close
                }`}
                onClick={() => {
                  this.toggleMic();
                }}
              ></div>
            )}
            {this.props.core._config.showMyCameraToggleButton && (
              <div
                className={`${ZegoRoomCss.cameraButton} ${
                  !this.state.cameraOpen && ZegoRoomCss.close
                }`}
                onClick={() => {
                  this.toggleCamera();
                }}
              ></div>
            )}
            {this.props.core._config.showScreenSharingButton && (
              <div
                className={`${ZegoRoomCss.screenButton} ${
                  this.state.isScreenSharingBySelf && ZegoRoomCss.sharing
                }`}
                onClick={() => {
                  this.toggleScreenSharing();
                }}
              ></div>
            )}
            <div
              ref={this.moreRef}
              className={ZegoRoomCss.moreButton}
              onClick={() => {
                this.openSettings();
              }}
            >
              <div
                className={ZegoRoomCss.settingsButtonModel}
                style={{
                  display: this.state.showSettings ? "block" : "none",
                }}
                ref={this.settingsRef}
              >
                {this.state.layout && (
                  <div onClick={() => this.showLayoutSettings(true)}>
                    Change layout
                  </div>
                )}
                {this.props.core._config.showAudioVideoSettingsButton && (
                  <span></span>
                )}
                {this.props.core._config.showAudioVideoSettingsButton && (
                  <div onClick={() => this.handleSetting()}>Settings</div>
                )}
              </div>
            </div>

            <div
              className={ZegoRoomCss.leaveButton}
              onClick={() => {
                this.handleLeave();
              }}
            ></div>
          </div>
          <div className={ZegoRoomCss.handlerRight}>
            {this.props.core._config.showUserList && (
              <div
                className={ZegoRoomCss.memberButton}
                onClick={() => {
                  this.toggleLayOut("USER_LIST");
                }}
              >
                <span className={ZegoRoomCss.memberNum}>
                  {this.state.zegoCloudUserList.length > 99
                    ? "99+"
                    : this.state.zegoCloudUserList.length + 1}
                </span>
              </div>
            )}
            {this.props.core._config.showTextChat && (
              <div
                className={ZegoRoomCss.msgButton}
                onClick={() => {
                  this.toggleLayOut("MESSAGE");
                }}
              ></div>
            )}
          </div>
        </div>
        <div
          className={ZegoRoomCss.reconnect}
          style={{
            display: this.state.connecting ? "flex" : "none",
            backgroundColor: this.state.firstLoading ? "#1C1F2E" : "",
          }}
        >
          <div></div>
          <p>
            {this.state.firstLoading
              ? "Joining Room"
              : "There's something wrong with your network. Trying to reconnect..."}
          </p>
        </div>
        {this.state.showLayoutSettingsModel && (
          <div className={ZegoRoomCss.layoutSettingsMask}>
            <div className={ZegoRoomCss.layoutSettingsWrapper}>
              <div className={ZegoRoomCss.layoutSettingsHeader}>
                <p>Change layout</p>
                <span
                  className={ZegoRoomCss.layoutSettingsCloseIcon}
                  onClick={() => this.showLayoutSettings(false)}
                ></span>
              </div>
              <div className={ZegoRoomCss.layoutSettingsContent}>
                <div
                  className={ZegoRoomCss.layoutSettingsItemRow}
                  onClick={() => this.changeLayout("Default")}
                >
                  <p>
                    <span
                      className={`${ZegoRoomCss.layoutSettingsItemIcon} ${
                        this.state.layout === "Default"
                          ? ZegoRoomCss.layoutSettingsItemChecked
                          : ""
                      } ${
                        this.state.isLayoutChanging &&
                        this.state.layout === "Default"
                          ? ZegoRoomCss.layoutSettingsItemLoading
                          : ""
                      }`}
                    ></span>
                    Default
                  </p>
                </div>
                <div
                  className={ZegoRoomCss.layoutSettingsItemRow}
                  onClick={() => this.changeLayout("Grid")}
                >
                  <p>
                    <span
                      className={`${ZegoRoomCss.layoutSettingsItemIcon} ${
                        this.state.layout === "Grid"
                          ? ZegoRoomCss.layoutSettingsItemChecked
                          : ""
                      } ${
                        this.state.isLayoutChanging &&
                        this.state.layout === "Grid"
                          ? ZegoRoomCss.layoutSettingsItemLoading
                          : ""
                      }`}
                    ></span>
                    Grid
                  </p>
                  <img
                    src={require("../../../sdkAssets/img_layout_grid@2x.png")}
                    alt="grid layout"
                  />
                </div>
                <div
                  className={ZegoRoomCss.layoutSettingsItemRow}
                  onClick={() => this.changeLayout("Sidebar")}
                >
                  <p>
                    <span
                      className={`${ZegoRoomCss.layoutSettingsItemIcon} ${
                        this.state.layout === "Sidebar"
                          ? ZegoRoomCss.layoutSettingsItemChecked
                          : ""
                      } ${
                        this.state.isLayoutChanging &&
                        this.state.layout === "Sidebar"
                          ? ZegoRoomCss.layoutSettingsItemLoading
                          : ""
                      }`}
                    ></span>
                    Sidebar
                  </p>
                  <img
                    src={require("../../../sdkAssets/img_layout_sidebar@2x.png")}
                    alt="Sidebar layout"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}
