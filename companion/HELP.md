## PTZ Pilot

Control [PTZ Pilot](https://github.com/josephdadams/ptz-pilot), the app that flies VISCA PTZ cameras with game controllers and DJI drone remotes, and see what it's doing.

### Setup

1. In PTZ Pilot, open **Settings** and make sure the **Remote control API** is enabled. It listens on port **8765** by default.
2. If Companion runs on another computer, also tick **Allow connections from other computers** there.
3. Add this connection in Companion and enter the address of the computer running PTZ Pilot (`127.0.0.1` if it's the same one) and the port.

Cameras and controllers are read from PTZ Pilot, so dropdowns fill in once the connection is up. They also accept a typed camera name or number, or a controller name.

### Actions

- **Select camera in PTZ Pilot**: show a camera in PTZ Pilot's window. Actions set to _Camera selected in PTZ Pilot_ act on it.
- **Controller: drive camera** / **Controller: next or previous camera**: reassign a controller.
- **Recall preset** / **Store preset**: presets are numbered from 1, as in PTZ Pilot.
- **Home**, **One-push autofocus**, **Autofocus on or off**.
- **Move (hold)** and **Stop moving**: put Move on a button's press and Stop on its release. The camera moves until it's told to stop, and PTZ Pilot also stops it if Companion disconnects. Moving from Companion combines with any controller on the same camera: for each movement, whichever pushes harder wins.

### Feedbacks

- **Camera: status**: responding, not responding, no reply yet, not connected, error, or any problem.
- **Camera: selected in PTZ Pilot**, **Camera: moving** (any, pan, tilt, zoom or focus), **Camera: driven by a controller**.
- **Controller: connected**, **Controller: drives camera**.

### Variables

Numbered by position in PTZ Pilot's lists:

- `camera_N_name`, `camera_N_status`, `camera_N_address`, `camera_N_controllers`, `camera_N_moving`
- `camera_N_pan`, `camera_N_tilt`, `camera_N_zoom`, `camera_N_focus`: the speeds being sent right now, signed (pan right, tilt up, zoom in and focus far are positive)
- `controller_N_name`, `controller_N_connected`, `controller_N_camera`
- `selected_camera_name`, `selected_camera_number`, `camera_count`, `controller_count`, `controllers_connected`, `connected`, `version`

### Presets

- **Each camera**: select (highlighted while selected, red text on a problem), hold-to-move arrows including diagonals, zoom and focus, home, one-push autofocus, and presets 1 to 8.
- **Controllers**: a button per controller that shows its camera and steps to the next one, plus a button per camera to assign it directly.
