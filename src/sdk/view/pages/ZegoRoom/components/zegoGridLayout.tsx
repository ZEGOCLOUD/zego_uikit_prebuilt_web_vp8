import React from "react";
import { ZegoGridLayoutProps } from "../../../../model";
import ZegoGridCss from "./zegoGridLayout.module.scss";
import clsx from "clsx";
import { OthersVideo, VideoPlayer } from "./zegoCommonComponents";

export class ZegoGridLayout extends React.Component<ZegoGridLayoutProps> {
  render(): React.ReactNode {
    let wrapClassName;
    if (this.props.gridRowNumber === 3) {
      wrapClassName = clsx({
        [ZegoGridCss.gridWrapper]: true,
        [ZegoGridCss.double]: this.props.userList.length <= 2,
        [ZegoGridCss.three]:
          this.props.userList.length === 4 || this.props.userList.length === 3,
        [ZegoGridCss.six]:
          this.props.userList.length === 6 || this.props.userList.length === 5,
        [ZegoGridCss.night]: this.props.userList.length >= 7,
      });
    } else if (this.props.gridRowNumber === 2) {
      const col = this.props.videoShowNumber / 2;
      const half = Math.ceil(this.props.userList.length / 2);
      let n =
        this.props.userList.length >= this.props.videoShowNumber ? col : half;
      wrapClassName = clsx({
        [ZegoGridCss.gridWrapper]: true,
        [ZegoGridCss.twoRow]: n === 5,
        [ZegoGridCss.twoRowFourCol]: n === 4,
        [ZegoGridCss.twoRowThreeCol]: n === 3,
        [ZegoGridCss.twoRowTwoCol]: n === 2,
        [ZegoGridCss.twoRowOneCol]: this.props.userList.length <= 2,
      });
    } else {
      wrapClassName = clsx({
        [ZegoGridCss.gridWrapper]: true,
        [ZegoGridCss.singleRow]: true,
      });
    }

    return (
      <>
        <div className={wrapClassName}>
          {this.props.userList.map((user, index, arr) => {
            if (arr.length > this.props.videoShowNumber) {
              if (index === this.props.videoShowNumber - 1) {
                return (
                  <OthersVideo
                    key={user.userID}
                    users={[arr[index].userName!, arr[index + 1]?.userName!]}
                    others={arr.length - this.props.videoShowNumber}
                  ></OthersVideo>
                );
              }
              if (index > this.props.videoShowNumber - 1) {
                return (
                  <audio
                    key={user.userID}
                    autoPlay
                    ref={(el) => {
                      el &&
                        el.srcObject !== user.streamList[0]?.media &&
                        (el.srcObject = user.streamList[0]?.media);
                    }}
                  ></audio>
                );
              }
            }
            return (
              <VideoPlayer
                key={user.userID}
                userInfo={user}
                muted={user.userID === this.props.selfInfo!.userID}
                handlePin={() => this.props.handleSetPin!(user.userID)}
              ></VideoPlayer>
            );
          })}
        </div>
      </>
    );
  }
}
