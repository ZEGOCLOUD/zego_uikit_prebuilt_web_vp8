import React from "react";
import { ZegoCloudUser } from "../../../modules/tools/UserListManager";
import ShowPCManageContext, {
  ShowPCManageType,
} from "../../pages/ZegoRoom/context/showManage";
import flvjs from "flv.js";
import { isSafari, isPc } from "../../../util";
import ZegoVideoCss from "./index.module.scss";

export default class ZegoVideo extends React.PureComponent<{
  muted: boolean;
  classList: string;
  userInfo: ZegoCloudUser;
  onPause?: Function;
  onCanPlay?: Function;
}> {
  static contextType?: React.Context<ShowPCManageType> = ShowPCManageContext;
  context!: React.ContextType<typeof ShowPCManageContext>;
  videoRef: HTMLVideoElement | null = null;
  flvPlayer: flvjs.Player | null = null;
  timer: NodeJS.Timer | null = null;
  state: {
    isPaused: boolean;
  } = {
    isPaused: false,
  };
  componentDidMount() {
    this.initVideo(this.videoRef!);
  }
  componentDidUpdate(preProps: { userInfo: ZegoCloudUser }) {
    if (preProps.userInfo !== this.props.userInfo) {
      this.initVideo(this.videoRef!);
    }
  }
  initVideo(el: HTMLVideoElement) {
    if (el) {
      el.muted = this.props.muted;
      (el as any)?.setSinkId?.(this.context?.speakerId || "");
      if (this.props.userInfo?.streamList?.[0]?.media) {
        el.srcObject !== this.props.userInfo?.streamList?.[0]?.media &&
          (el.srcObject = this.props.userInfo?.streamList?.[0]?.media!);
      } else if (this.props.userInfo?.streamList?.[0]?.urlsHttpsFLV) {
        if (isSafari()) {
          if (el.src !== this.props.userInfo?.streamList?.[0]?.urlsHttpsHLS) {
            el.src = this.props.userInfo?.streamList?.[0]?.urlsHttpsHLS!;
            el.load();
            const promise = el.play();
            if (promise !== undefined) {
              promise
                .catch((error) => {
                  // Auto-play was prevented
                  // Show a UI element to let the user manually start playback
                  console.error("play", error);
                  this.setState({
                    isPaused: true,
                  });
                })
                .then(() => {
                  // Auto-play started
                });
            }
          }
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
    if (!flvjs.isSupported()) return;
    if (this.flvPlayer) return;
    this.flvPlayer = flvjs.createPlayer({
      type: "flv",
      isLive: true,
      url: url,
      cors: true,
      hasAudio: this.props.userInfo.streamList?.[0]?.hasAudio, //是否需要音频
      hasVideo: this.props.userInfo.streamList?.[0]?.hasVideo, //是否需要视频
    });
    this.flvPlayer.on(flvjs.Events.LOADING_COMPLETE, () => {
      this.flvPlayer?.play();
    });
    this.flvPlayer.attachMediaElement(videoElement);
    this.flvPlayer.load();
  }

  pcSafariMultipleVideoSpecialAction(el: HTMLVideoElement) {
    el.muted = this.context.canAutoPlay ? this.props.muted : true;
    !this.context.canAutoPlay &&
      (el.onclick = () => {
        document.querySelectorAll("video").forEach((v) => {
          v.muted = false;
          v.play();
          v.onclick = null;
        });
        this.context.setAutoPlay && this.context.setAutoPlay();
      });
    this.timer = setInterval(() => {
      if (el.paused) {
        el.load();
        console.error("load");
      } else {
        clearInterval(this.timer!);
        this.timer = null;
      }
    }, 2000);
  }
  componentWillUnmount() {
    if (this.flvPlayer) {
      this.flvPlayer.pause();
      this.flvPlayer.unload();
      this.flvPlayer.detachMediaElement();
      this.flvPlayer.destroy();
      this.flvPlayer = null;
    } else {
      this.videoRef?.srcObject && (this.videoRef.srcObject = null);
      this.videoRef?.src && (this.videoRef.src = "");
    }
    this.timer && clearInterval(this.timer);
  }
  render(): React.ReactNode {
    return (
      <>
        <video
          // muted={this.props.muted}
          autoPlay
          className={`${ZegoVideoCss.video} ${this.props.classList}`}
          playsInline={true}
          ref={(el: HTMLVideoElement) => {
            !this.videoRef && (this.videoRef = el);
          }}
          onPause={() => {
            this.setState({
              isPaused: true,
            });
            this.props.onPause && this.props.onPause();
          }}
          onCanPlay={() => {
            this.videoRef?.play();
            this.props.onCanPlay && this.props.onCanPlay();
          }}
          onPlay={() => {
            this.setState({
              isPaused: false,
            });
          }}
        ></video>
        {this.state.isPaused && (
          <div
            className={`${ZegoVideoCss.videoPlayBtn} ${
              isPc() ? "" : ZegoVideoCss.mobile
            }`}
            onClick={() => {
              this.videoRef?.play();
              this.setState({
                isPaused: false,
              });
            }}
          ></div>
        )}
      </>
    );
  }
}
function isPC() {
  throw new Error("Function not implemented.");
}
