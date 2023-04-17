

ls -la /dev/ | grep ACM
if [ -d '/dev/ttyACM0' ]; then
    echo "USB device found as direcotry"
    sudo rm -rf /dev/ttyACM0
    echo "USB device removed"

elif [ -c '/dev/ttyACM0' ]; then
    echo "USB device found as character"
    echo "everything is fine"
else
    echo "USB device not found"
fi