odoo.define('pos_facturalo_api.pos_screens', function (require) {
  "use strict";

  var screens = require('point_of_sale.screens');
  var models = require('point_of_sale.models');
  var PaymentScreenWidget = screens.PaymentScreenWidget;

  var _super_order = models.Order.prototype;

  models.PosModel.prototype.models.push({
    model: 'einvoice.catalog.06',
    fields: [
      'name',
      'code'
    ],
    domain:  function(self){
      return [];
    },
    context: function(self){
      return {};
    },
    loaded: function(self, doc_types){
      self.doc_types = doc_types;
    },
  });

  models.PosModel.prototype.models.push({
    model: 'pos.order.document.type',
    fields: [
    'name',
  ],
    domain:  function(self){
      return [];
    },
    context: function(self){
      return {};
    },
    loaded: function(self, pos_doc_types){
      self.pos_doc_types = pos_doc_types;
    },
  });

  models.PosModel.prototype.models.push({
    model: 'pos.order.serial.number',
    fields: [
    'name',
    'document_type_id',
    'document_type_name',
  ],
    domain:  function(self){
      return [];
    },
    context: function(self){
      return {};
    },
    loaded: function(self, serial_numbers){
      self.serial_numbers = serial_numbers;
    },
  });
  models.load_fields('res.partner', ['doc_number', 'catalog_06_id', 'state'])
  models.load_fields('pos.order', ['api_external_id', 'api_number_feapi', 'api_link_cdr', 'api_link_pdf', 'api_link_xml'])

  models.Order = models.Order.extend({
    initialize: function() {
      _super_order.initialize.apply(this, arguments);
      var order = this.pos.get_order();
      this.api_number_feapi = this.api_number_feapi || '';
      this.api_external_id = this.api_external_id || '';
      this.api_link_cdr = this.api_link_cdr || '';
      this.api_link_xml = this.api_link_xml || '';
      this.api_link_pdf = this.api_link_pdf || '';
      this.api_qr = this.api_qr || '';
      this.serial_number = this.serial_number || '';
      this.invoice_type = this.invoice_type || '';
      this.save_to_db();
      return this
    },
    export_as_JSON: function() {
      var json = _super_order.export_as_JSON.apply(this,arguments);
      json.api_external_id = this.api_external_id;
      json.api_number_feapi = this.api_number_feapi;
      json.api_link_cdr = this.api_link_cdr;
      json.api_link_xml = this.api_link_xml;
      json.api_link_pdf = this.api_link_pdf;
      json.api_qr = this.api_qr;
      return json;
    },
  });

  screens.ClientListScreenWidget.include({
    save_client_details: function(partner) {
      var self = this;
      var fields = {};
      this.$('.client-details-contents .detail').each(function(idx,el){
        fields[el.name] = el.value || false;
      });

      if (!fields.doc_number || !fields.catalog_06_id) {
        this.gui.show_popup(
          'error',
          'Debe llenar los campos de Tipo de Documento y Número de Documento en el formulario del cliente.'
        );
        return;
      }
      this._super(partner);
    },
  });

  PaymentScreenWidget.include({
    start: function () {
      this._super();
      this.init_select2_serial_number();
    },
    init_select2_serial_number: function() {
      this.$('#factura_select').select2({
        width: 'resolve'
      });
      this.$('#boleta_select').select2({
        width: 'resolve'
      });
    },
    click_factura_f001: function () {
      var self = this
      var def  = new $.Deferred();
      var order = self.pos.get_order();

      var list = [];
      for (var i = 0; i < self.pos.serial_numbers.length; i++) {
        var serial_number = self.pos.serial_numbers[i];
        if (serial_number.document_type_name == 'Factura') {
          list.push({
            'label': serial_number.name,
            'item':  serial_number.name,
          });
        }
      }

      if ($(".js_boleta_b001").hasClass("highlight")) {
        $(".js_boleta_b001").toggleClass("highlight");
      }

      if (!$(".js_factura_f001").hasClass("highlight")) {
        self.gui.show_popup('selection', {
          title: "Número de serie",
          list: list,
          confirm: function(item) {
            order.serial_number = item
            order.invoice_type = '01';
            def.resolve(item)
          },
          cancel: function(){
            order.serial_number = '';
            order.invoice_type = '';
            $(".js_factura_f001").toggleClass("highlight");
            def.reject();
          }
        });
      } else {
        order.serial_number = '';
        order.invoice_type = '';
      }

      $(".js_factura_f001").toggleClass("highlight");
    },
    click_boleta_b001: function () {
      var self = this
      var def  = new $.Deferred();
      var order = self.pos.get_order();
      var list = [];
      for (var i = 0; i < self.pos.serial_numbers.length; i++) {
        var serial_number = self.pos.serial_numbers[i];
        if (serial_number.document_type_name == 'Boleta') {
          list.push({
            'label': serial_number.name,
            'item':  serial_number.name,
          });
        }
      }

      if ($(".js_factura_f001").hasClass("highlight")) {
        $(".js_factura_f001").toggleClass("highlight");
      }

      if (!$(".js_boleta_b001").hasClass("highlight")) {
        self.gui.show_popup('selection', {
          title: "Número de serie",
          list: list,
          confirm: function(item) {
            order.serial_number = item;
            order.invoice_type = '03';
            def.resolve(item)
          },
          cancel: function(){
            order.serial_number = '';
            order.invoice_type = '';
            $(".js_boleta_b001").toggleClass("highlight");
            def.reject();
          }
        });
      } else {
        order.serial_number = '';
        order.invoice_type = '';
      }

      $(".js_boleta_b001").toggleClass("highlight");
    },
    renderElement: function() {
      var self = this;
      this._super();

      this.$('.js_factura_f001').click(function(){
        self.click_factura_f001();
      });

      this.$('.js_boleta_b001').click(function(){
        self.click_boleta_b001();
      });
    },
    send_facturalo_request: function(url, token, data) {
      var request = $.ajax({
        url: url,
        method: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify(data),
        cache: false,
        beforeSend: function (xhr) {
          xhr.setRequestHeader(
            "Authorization",
            'Bearer ' + token
          );
        },
      })
      return $.when(
        request
      )
    },
    save_order_to_sync: function(data) {
      var order = this.pos.get_order();
      data.pos_reference = order.name
      data.session_id = this.pos.pos_session.id
      return $.when(
        this._rpc({
          model: 'pos.order.sync',
          method: 'create',
          args: [data],
        })
      )
    },
    order_is_valid: function(force_validation) {
      var self = this;
      var sup = this._super(force_validation);
      var order = this.pos.get_order();

      if (!sup) {
        return false;
      }

      if (this.pos.config.is_facturalo_api && this.pos.config.facturalo_endpoint_state == 'success') {
        var client = order.get_client();

        if (!client) {
          self.gui.show_popup('error', {
            title: 'Error',
            body:  'Debe seleccionar un cliente para avanzar con la venta.'
          });
          return false;
        }

        if (!client.catalog_06_id) {
          self.gui.show_popup('error', {
            title: 'Error',
            body:  'El cliente seleccionado no tiene el tipo de documento registrado, por favor actualice la información del cliente.'
          });
          return false;
        }

        if (!client.doc_number) {
          self.gui.show_popup('error', {
            title: 'Error',
            body:  'El cliente seleccionado no tiene el número de documento registrado, por favor actualice la información del cliente.'
          });
          return false;
        }

        var doc_type = this.pos.doc_types.filter(function(doc_type) {
          return doc_type.id == client.catalog_06_id[0]
        })[0].code

        var company = this.pos.company;
        var currency = this.pos.currency;

        if (!$(".js_boleta_b001").hasClass("highlight") && !$(".js_factura_f001").hasClass("highlight")) {
          self.gui.show_popup('error', {
            title: 'Error',
            body:  'Debe seleccionar una opción de método facturación (Boleta B001 ó Factura F001).'
          });
          return false;
        }

        var invoice_type = order.invoice_type
        var serial_number = order.serial_number + '-' + order.sequence_number;
        var now = moment();
        var order_date_formatted = now.format('YYYY-MM-DD');
        var order_time = now.format('HH:mm:ss');

        var amount_with_tax = order.get_total_with_tax();
        var total_without_tax = order.get_total_without_tax();
        var amount_tax = order.get_total_tax();

        var items = [];

        var orderLines = order.get_orderlines();
        for (var i = 0; i < orderLines.length; i++) {
          var line = orderLines[i];
          var product = line.get_product();
          var product_quantity = line.get_quantity();
          var product_taxes_total = 0.0;
          var taxDetails = line.get_tax_details();
          for(var id in taxDetails){
            product_taxes_total += taxDetails[id];
          }
          var taxes_porcentage = Math.round((((product.list_price + product_taxes_total) - product.list_price) / product.list_price) * 100) / product_quantity;
          var amountIgv = ((product.list_price) * (taxes_porcentage)) / 100;

          items.push({
            "codigo_interno_del_producto": "P0121",
            "descripcion_detallada": product.display_name,
            "codigo_producto_de_sunat": "51121703",
            "unidad_de_medida": "NIU",
            "cantidad_de_unidades": product_quantity,
            "valor_unitario": product.standard_price,
            "codigo_de_tipo_de_precio": "01",
            "precio_de_venta_unitario_valor_referencial": product.list_price + product_taxes_total,
            "afectacion_al_igv": "10",
            "porcentaje_de_igv": taxes_porcentage / product_quantity,
            "monto_de_igv": amountIgv,
            "valor_de_venta_por_item": product.list_price,
            "total_por_item": product.list_price + product_taxes_total
          })
        }

        var data = {
          "version_del_ubl": "v21",
          "serie_y_numero_correlativo": serial_number,
          "fecha_de_emision": order_date_formatted,
          "fecha_de_vencimiento": order_date_formatted,
          "hora_de_emision": order_time,
          "tipo_de_documento": invoice_type,
          "tipo_de_moneda": currency.name,
          "datos_del_emisor": {
            "codigo_del_domicilio_fiscal": "0001"
          },
          "datos_del_cliente_o_receptor": {
            "numero_de_documento": client.vat,
            "tipo_de_documento": doc_type,
            "apellidos_y_nombres_o_razon_social": client.name,
            "direccion": client.address
          },
          "totales": {
            "total_operaciones_gravadas": total_without_tax,
            "sumatoria_igv": amount_tax,
            "total_de_la_venta": amount_with_tax
          },
          "items": items,
          "informacion_adicional": {
            "tipo_de_operacion": "0101",
            "leyendas": []
          },
          "extras": {
            "forma_de_pago": "Efectivo",
            "observaciones": "probando"
          }
        }

        var url = this.pos.config.iface_facturalo_url_endpoint;
        var token = this.pos.config.iface_facturalo_token;
        var def = $.Deferred();

        this.send_facturalo_request(url, token, data)
          .done(function(data) {
            var data_response = {
              api_number_feapi: data['data']['number'],
              api_external_id: data['data']['external_id'],
              api_link_cdr: data['data']['link_cdr'],
              api_link_xml: data['data']['link_xml'],
              api_link_pdf: data['data']['link_pdf'],
              api_qr: data['data']['qr'],
            }

            var domain = [['pos_reference', '=', order.name], ['session_id', '=', self.pos.pos_session.id]];
            setTimeout(function () {
              self._rpc({
                model: 'pos.order',
                method: 'search_read',
                domain: domain,
                fields: ['id'],
              }).done(function(o) {

                if (o.length == 0) {
                  self.save_order_to_sync(data_response)
                  def.reject()
                } else {
                  self._rpc({
                    model: 'pos.order',
                    method: 'write',
                    args: [[o[0].id], data_response],
                  }).done(function() {
                    def.resolve()
                  }).fail(function(err) {
                    self.save_order_to_sync(data_response)
                    new Noty({
                      theme: 'bootstrap-v4',
                      type: 'warning',
                      timeout: 10000,
                      layout: 'bottomRight',
                      text: '<h3>La operación ha sido registrada con algunos incovenientes en el pedido, para actualizar el pedido debe dirigirse al módulo de punto de venta e ingresar en el menú «Pedidos por sincronizar» y ejecutar las acciones pertinentes.</h3>'
                    }).show();
                    def.reject()
                  })
                }

              }).fail(function(err) {
                self.save_order_to_sync(data_response)
                new Noty({
                  theme: 'bootstrap-v4',
                  type: 'warning',
                  timeout: 10000,
                  layout: 'bottomRight',
                  text: '<h3>La operación ha sido registrada con algunos incovenientes en el pedido, para actualizar el pedido debe dirigirse al módulo de punto de venta e ingresar en el menú «Pedidos por sincronizar» y ejecutar las acciones pertinentes.</h3>'
                }).show();
                def.reject()
              })

            }, 3000);

            new Noty({
              theme: 'bootstrap-v4',
              type: 'success',
              timeout: 3000,
              layout: 'bottomRight',
              text: '<h3>La operación ha finalizado.</h3>'
            }).show();

            $('#qr').html(
              '<img style="margin-top:20px;" class="qr_code" src="data:image/png;base64, ' + data['data']['qr'] + '" />'
            )

          }).fail(function() {
            def.reject()
            self.gui.show_popup('error', {
              title: 'Error',
              body:  'Ha ocurrido un error en el envío de la petición a la API de Facturalo Peru ' +
              'por lo que no puede continuar con la venta.\n\nSí sigue experimentando este error consulte con el Administrador.',
            });
            return false;
          })
      };
      return true;
    },
  });
});
