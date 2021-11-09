# import the necessary packages
from genericpath import isfile
from imutils.video import FPS, VideoStream
from datetime import datetime
import face_recognition
import argparse
import imutils
import pickle
import time
import cv2
import json
import sys
import signal
import os
import numpy as np

def printjson(type, message):
	print(json.dumps({type: message}))
	sys.stdout.flush()

def signalHandler(signal, frame):
	global closeSafe
	closeSafe = True

signal.signal(signal.SIGINT, signalHandler)
closeSafe = False

# construct the argument parser and parse the arguments
ap = argparse.ArgumentParser()
ap.add_argument("-c", "--cascade", type=str, required=False, default="haarcascade.xml", help = "path to where the face cascade resides")
ap.add_argument("-e", "--encodings", type=str, required=False, default="encodings.pickle", help="path to serialized db of facial encodings")
ap.add_argument("-p", "--usePiCamera", type=int, required=False, default=1, help="Is using picamera or builtin/usb cam")
ap.add_argument("-s", "--source", required=False, default=0, help="Use 0 for /dev/video0 or 'http://link.to/stream'")
ap.add_argument("-r", "--rotateCamera", type=int, required=False, default=0, help="rotate camera")
ap.add_argument("-m", "--method", type=str, required=False, default="dnn", help="method to detect faces (dnn, haar)")
ap.add_argument("-d", "--detectionMethod", type=str, required=False, default="hog", help="face detection model to use: either `hog` or `cnn`")
ap.add_argument("-i", "--interval", type=int, required=False, default=2000, help="interval between recognitions")
ap.add_argument("-ds", "--dataset", required=False, default="../dataset/", help="path to input directory of faces + images")
ap.add_argument("-t", "--tolerance", type=float, required=False, default=0.6, help="How much distance between faces to consider it a match. Lower is more strict.")
args = vars(ap.parse_args())

# load the known faces and embeddings along with OpenCV's Haar cascade
printjson("status", "loading encodings + face detector...")
data = pickle.loads(open(args["encodings"], "rb").read())
detector = cv2.CascadeClassifier(args["cascade"])

# initialize the video stream and allow the camera sensor to warm up
printjson("status", "starting video stream...")

if args["source"].isdigit():
    src = int(args["source"])
else:
    src = args["source"]

if args["usePiCamera"] >= 1:
	vs = VideoStream(usePiCamera=True, rotation=args["rotateCamera"]).start()
else:
	vs = VideoStream(src=src).start()

time.sleep(2.0)
tolerance = float(args["tolerance"])
fps = FPS().start()

while True:
	originalFrame = vs.read()
	frame = imutils.resize(originalFrame, width=500)

	if args["method"] == "dnn":
		rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
		boxes = face_recognition.face_locations(rgb, model=args["detectionMethod"])
	elif args["method"] == "haar":
		gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
		rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
		rects = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30), flags=cv2.CASCADE_SCALE_IMAGE)
		boxes = [(y, x + w, y + h, x) for (x, y, w, h) in rects]

	# compute the facial embeddings for each face bounding box
	encodings = face_recognition.face_encodings(rgb, boxes)

	# loop over the facial encodings
	for encoding in encodings:
		# compute distances between this encoding and the faces in dataset
		distances = face_recognition.face_distance(data["encodings"], encoding)

		minDistance = 1.0
		if len(distances) > 0:
			# the smallest distance is the closest to the encoding
			minDistance = min(distances)

		# save the name if the distance is below the tolerance
		if minDistance < tolerance:
			idx = np.where(distances == minDistance)[0][0]
			uid = data["UIDs"][idx]
		else:
			uid = "unknown"
			# set correct path to the dataset to save unknown image
			path = os.path.dirname('modules/MMM-Face/res/images/unknown/')
			today = datetime.now()
			fname = today.strftime("%Y%m%d_%H%M%S_%f") + '.jpg'
			cv2.imwrite(path + '/' + fname, originalFrame)
			printjson("unknown", {"image": fname})

		# sending detected user uid
		printjson("user", {"uid": uid})

	# update the FPS counter
	fps.update()

	key = cv2.waitKey(1) & 0xFF
	# if the `q` key was pressed, break from the loop
	if key == ord("q") or closeSafe == True:
		break

	time.sleep(args["interval"] / 1000)

# stop the timer and display FPS information
fps.stop()
printjson("status", "elasped time: {:.2f}".format(fps.elapsed()))
printjson("status", "approx. FPS: {:.2f}".format(fps.fps()))

# do a bit of cleanup
cv2.destroyAllWindows()
vs.stop()
