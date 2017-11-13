Date.prototype.vnDate = function () {
    var yyyy = this.getFullYear();
    var mm = this.getMonth() + 1;
    var dd = this.getDate();

    var hours = this.getHours();
    var minutes = this.getMinutes();
    var seconds = this.getSeconds();

    return dd + "/" + mm + "/" + yyyy + " " + hours + ":" + minutes + ":" + seconds;
}

module.exports = Date.prototype.vnDate;