import ReactDOM, { Root } from "react-dom/client";
import { LiveRole, ScenarioModel, ZegoCloudRoomConfig } from "./model/index";
import { ZegoCloudRTCCore } from "./modules/index";
import { generatePrebuiltToken } from "./util";
import { ZegoCloudRTCKitComponent } from "./view/index";

export class ZegoUIKitPrebuilt {
  static core: ZegoCloudRTCCore | undefined;
  static _instance: ZegoUIKitPrebuilt;
  static Host = LiveRole.Host;
  static Cohost = LiveRole.Cohost;
  static Audience = LiveRole.Audience;

  static OneONoneCall = ScenarioModel.OneONoneCall;
  static GroupCall = ScenarioModel.GroupCall;
  static LiveStreaming = ScenarioModel.LiveStreaming;
  static VideoConference = ScenarioModel.VideoConference;
  private hasJoinedRoom = false;
  root: Root | undefined;

  static generateKitTokenForTest(
    appID: number,
    serverSecret: string,
    roomID: string,
    userID: string,
    userName?: string,
    ExpirationSeconds?: number
  ) {
    return generatePrebuiltToken(
      appID,
      serverSecret,
      roomID,
      userID,
      userName,
      ExpirationSeconds
    );
  }

  static generateKitTokenForProduction(
    appID: number,
    token: string,
    roomID: string,
    userID: string,
    userName?: string
  ) {
    return (
      token +
      "#" +
      window.btoa(JSON.stringify({ userID, roomID, userName, appID }))
    );
  }

  static create(kitToken: string): ZegoUIKitPrebuilt {
    if (!ZegoUIKitPrebuilt.core && kitToken) {
      ZegoUIKitPrebuilt.core = ZegoCloudRTCCore.getInstance(kitToken);
      ZegoUIKitPrebuilt._instance = new ZegoUIKitPrebuilt();
    }
    return ZegoUIKitPrebuilt._instance;
  }

  joinRoom(roomConfig?: ZegoCloudRoomConfig) {
    if (!ZegoUIKitPrebuilt.core) {
      console.error("【ZEGOCLOUD】 please call init first !!");
      return;
    }
    if (this.hasJoinedRoom) {
      console.error("【ZEGOCLOUD】joinRoom repeat !!");
      return;
    }
    if (!roomConfig || !roomConfig.container) {
      console.warn("【ZEGOCLOUD】joinRoom/roomConfig/container required !!");
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.width = "100vw";
      div.style.height = "100vh";
      div.style.minWidth = "345px";
      div.style.top = "0px";
      div.style.left = "0px";
      div.style.zIndex = "100";
      div.style.backgroundColor = "#FFFFFF";
      div.style.overflow = "auto";
      document.body.appendChild(div);
      roomConfig = {
        ...roomConfig,
        ...{
          container: div,
        },
      };
    }

    const result = ZegoUIKitPrebuilt.core.setConfig(roomConfig);
    if (result) {
      this.root = ReactDOM.createRoot(roomConfig.container as HTMLDivElement);
      this.root.render(
        <ZegoCloudRTCKitComponent
          core={ZegoUIKitPrebuilt.core}
        ></ZegoCloudRTCKitComponent>
      );
      this.hasJoinedRoom = true;
    }
  }

  destroy() {
    ZegoUIKitPrebuilt.core?.leaveRoom?.();
    ZegoUIKitPrebuilt.core = undefined;
    // @ts-ignore
    ZegoCloudRTCCore._instance = undefined;
    this.root?.unmount?.();
    this.root = undefined;
    this.hasJoinedRoom = false;
  }
}
