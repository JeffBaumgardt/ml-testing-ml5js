import * as React from "react";
import * as ml5 from "ml5";

import { images } from "./images";

const getImageDimensions = (
  img: HTMLImageElement,
  maxHeight: number,
  maxWidth: number
): Promise<{ height: number; width: number }> => {
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const ratio = img.width / img.height;

      let newWidth = maxWidth;
      let newHeight = Math.ceil(newWidth / ratio);
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * ratio;
      }
      resolve({
        height: newHeight,
        width: newWidth,
      });
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
};

type ImageLoadTime = Record<string, number>;

function App() {
  const [imageCount, setImageCount] = React.useState(0);
  const [imageLoadTimes, setImageLoadTimes] = React.useState<ImageLoadTime>({});
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);

  const [predictionText, setPredictionText] = React.useState<JSX.Element[]>([]);
  const [modalLoadStart, setModalLoadStart] = React.useState(0);
  const [modalLoadEnd, setModalLoadEnd] = React.useState(0);
  const [firstTimeStamp, setFirstTimeStamp] = React.useState(0);
  const [secondTimeStamp, setSecondTimeStamp] = React.useState(0);

  const [model, setModel] = React.useState<any>();

  const loadModel = React.useCallback(async () => {
    const model = await ml5.imageClassifier("MobileNet");
    setModel(model);
    setModalLoadEnd(window.performance.now());
  }, []);

  const buildPredictionText = (
    predictions: { label: any; confidence: any }[]
  ) => {
    const newPredictionText = predictions.map((prediction) => {
      console.log(prediction);
      return (
        <li key={prediction.label + prediction.confidence}>
          {prediction.label}: {prediction.confidence.toFixed(4)}
        </li>
      );
    });
    setPredictionText(newPredictionText);
    setSecondTimeStamp(window.performance.now());
  };

  const runPredictions = React.useCallback(async () => {
    if (!model || !image) {
      return;
    }
    setFirstTimeStamp(window.performance.now());
    const predictions = await model.classify(image);
    buildPredictionText(predictions);
  }, [image, model]);

  const loadImage = React.useCallback(async () => {
    const image = new Image();
    const randomImage = images[Math.floor(Math.random() * images.length)];

    image.src = randomImage;

    getImageDimensions(image, 600, 600).then(({ height, width }) => {
      setImage(image);
    });
    setImageCount((imageCount) => imageCount + 1);
  }, []);

  React.useEffect(() => {
    setModalLoadStart(window.performance.now());
    loadModel();
  }, [loadModel]);

  React.useEffect(() => {
    if (image) {
      setFirstTimeStamp(0);
      setSecondTimeStamp(0);
      runPredictions();
    }
  }, [image, runPredictions]);

  React.useEffect(() => {
    if (image && firstTimeStamp > 0 && secondTimeStamp > 0) {
      setImageLoadTimes((prevLoadTimes) => ({
        ...prevLoadTimes,
        [image.src]: secondTimeStamp - firstTimeStamp,
      }));
    }
  }, [firstTimeStamp, image, secondTimeStamp]);

  const averageTime = React.useMemo(() => {
    const times = Object.keys(imageLoadTimes).reduce(
      (prevImageTime, currentImage) => {
        const currentTime = imageLoadTimes[currentImage];
        return prevImageTime + currentTime;
      },
      0
    );
    console.log(times, imageLoadTimes);
    return times / imageCount;
  }, [imageLoadTimes, imageCount]);

  return (
    <div style={{ margin: 10 }}>
      {model ? (
        <div style={{ marginBottom: 10 }}>
          <button onClick={loadImage}>Load Random Image</button>
          <span style={{ marginLeft: 10 }}>
            Modal Load Time: {(modalLoadEnd - modalLoadStart).toFixed(2)}ms
          </span>
        </div>
      ) : (
        <div>Loading model...</div>
      )}
      {image ? (
        <>
          <div className="image-container">
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img src={image.src} alt="test-image" className="image-position" />
          </div>
          <ul>{predictionText}</ul>
          <p>
            Image inference time:{" "}
            {(secondTimeStamp - firstTimeStamp).toFixed(2)}ms
          </p>
          <p>Average inference time: {averageTime.toFixed(2)}ms</p>
        </>
      ) : null}
    </div>
  );
}

export default App;
