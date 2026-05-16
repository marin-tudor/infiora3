import Swal from 'sweetalert2';

export const showAlert = async ({
  button1Text,
  button2Text,
  onButton1Click,
  onButton2Click,
  ...options
}: any) => {
  const result = await Swal.fire({
    showConfirmButton: button1Text,
    showDenyButton: button2Text,
    showCloseButton: true,
    focusConfirm: false,
    denyButtonColor: 'black',
    confirmButtonColor: 'black',
    confirmButtonText: button1Text,
    denyButtonText: button2Text,
    onConfirm: onButton1Click,
    onDeny: onButton2Click,
    ...options,
  });

  if (onButton1Click && result.isConfirmed) {
    onButton1Click();
  } else if (onButton2Click && result.isDenied) {
    onButton2Click();
  } else if (options.onCancel && result.isDismissed) {
    options.onCancel();
  }
};
