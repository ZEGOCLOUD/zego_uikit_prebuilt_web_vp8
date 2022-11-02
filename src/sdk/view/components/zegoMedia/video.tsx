import React from "react";
import { ZegoCloudUser } from "../../../modules/tools/UserListManager";
import ShowPCManageContext from "../../pages/ZegoRoom/context/showManage";
import flvjs from "flv.js";

export default class ZegoVideo extends React.PureComponent<{
  muted: boolean;
  classList: string;
  userInfo: ZegoCloudUser;
  onPause?: Function;
  onCanPlay?: Function;
  key?: string;
}> {
  context!: React.ContextType<typeof ShowPCManageContext>;
  videoRef: HTMLVideoElement | null = null;
  flvPlayer: any;
  initVideo(el: HTMLVideoElement) {
    if (el) {
      this.videoRef = el;
      (el as any)?.setSinkId?.(this.context.speakerId || "");
      if (this.props.userInfo?.streamList?.[0]?.media) {
        el.srcObject !== this.props.userInfo?.streamList?.[0]?.media &&
          (el.srcObject = this.props.userInfo?.streamList?.[0]?.media!);
      } else if (this.props.userInfo?.streamList?.[0]?.urlsHttpsFLV) {
        if (this.isSafari()) {
          el.src !== this.props.userInfo?.streamList?.[0]?.urlsHttpsHLS &&
            (el.src = this.props.userInfo?.streamList?.[0]?.urlsHttpsHLS!);
        } else {
          this.initFLVPlayer(
            el,
            this.props.userInfo.streamList?.[0]?.urlsHttpsFLV
          );
        }
      }
    }
  }
  initFLVPlayer(videoElement: HTMLVideoElement, url: string) {
    if (this.flvPlayer) return;
    this.flvPlayer = flvjs.createPlayer({
      type: "flv",
      isLive: true,
      url: url,
      cors: true,
      hasAudio: true, //是否需要音频
      hasVideo: true, //是否需要视频
    });
    this.flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
      console.error("LOADING_COMPLETE");
      this.flvPlayer.play();
    });
    this.flvPlayer.attachMediaElement(videoElement);
    this.flvPlayer.load();
  }
  isSafari(): boolean {
    return (
      /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    );
  }
  componentWillUnmount() {
    if (this.flvPlayer) {
      this.flvPlayer.unload();
      this.flvPlayer.detachMediaElement();
    } else {
      this.videoRef?.srcObject && (this.videoRef.srcObject = null);
      this.videoRef?.src && (this.videoRef.src = "");
    }
  }
  render(): React.ReactNode {
    return (
      <video
        muted={this.props.muted}
        autoPlay
        controls
        className={this.props.classList}
        playsInline={true}
        key={
          this.props.key ||
          this.props.userInfo.userID + "_" + new Date().toString()
        }
        ref={this.initVideo.bind(this)}
        onPause={() => {
          this.props.onPause && this.props.onPause();
        }}
        onCanPlay={() => {
          this.videoRef?.play();
          this.props.onCanPlay && this.props.onCanPlay();
        }}
      ></video>
    );
  }
}
