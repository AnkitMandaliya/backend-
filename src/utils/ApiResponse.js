class ApiResponse {
  constructor(success,statuscode, message, data = null) {
    this.success = statuscode<400;
    this.message = message;
    this.data = data;
    this.statuscode = statuscode;
  }
}
export { ApiResponse };